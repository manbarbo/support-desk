import { CreateTicketHandler } from './create-ticket/create-ticket.handler';
import { AnalyzeTicketHandler } from './analize-ticket/analyze-ticket.handler';
import { TicketDlqHandler } from '@application/handlers/ticket-dlq.handler';
import { CreateTicketCommand } from './create-ticket/create-ticket.command';
import { AnalyzeTicketCommand } from './analize-ticket/analyze-ticket.command';
import { GetTicketHandler } from '@application/queries/tickets/get-ticket.handler';
import { ListTicketsHandler } from '@application/queries/tickets/list-tickets.handler';
import { GetTicketQuery } from '@application/queries/tickets/get-ticket.query';
import { ListTicketsQuery } from '@application/queries/tickets/list-tickets.query';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import {
  createMockTicket,
  createMockAnalysis,
  createMockTicketRepository,
  createMockMessagePublisher,
  createMockAIProvider,
  createMockLogger,
} from '../../../__mocks__/mocks';

describe('Ticket Pipeline (Integration)', () => {
  let createHandler: CreateTicketHandler;
  let analyzeHandler: AnalyzeTicketHandler;
  let dlqHandler: TicketDlqHandler;
  let getHandler: GetTicketHandler;
  let listHandler: ListTicketsHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let messagePublisher: ReturnType<typeof createMockMessagePublisher>;
  let aiProvider: ReturnType<typeof createMockAIProvider>;
  let ticketEventEmitter: { emitTicketUpdated: jest.Mock };
  let logger: ReturnType<typeof createMockLogger>;

  beforeAll(() => {
    ticketRepository = createMockTicketRepository();
    messagePublisher = createMockMessagePublisher();
    aiProvider = createMockAIProvider();
    ticketEventEmitter = { emitTicketUpdated: jest.fn() };
    logger = createMockLogger();

    createHandler = new CreateTicketHandler(
      ticketRepository,
      messagePublisher,
      logger,
    );
    analyzeHandler = new AnalyzeTicketHandler(
      ticketRepository,
      aiProvider,
      ticketEventEmitter as any,
      logger,
    );
    dlqHandler = new TicketDlqHandler(
      ticketRepository,
      ticketEventEmitter as any,
      logger,
    );
    getHandler = new GetTicketHandler(ticketRepository, logger);
    listHandler = new ListTicketsHandler(ticketRepository, logger);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create → Query Pipeline', () => {
    it('should create a ticket and then retrieve it', async () => {
      const createdTicket = createMockTicket({ id: 'pipeline-ticket-1' });
      ticketRepository.create.mockResolvedValue(createdTicket);
      ticketRepository.findById.mockResolvedValue(createdTicket);

      const ticket = await createHandler.execute(
        new CreateTicketCommand(
          'customer-1',
          'Order issue',
          'My order is late',
        ),
      );

      expect(ticket.id).toBe('pipeline-ticket-1');

      const found = await getHandler.execute(
        new GetTicketQuery('pipeline-ticket-1'),
      );

      expect(found).toEqual(createdTicket);
    });

    it('should create multiple tickets and list them all', async () => {
      const tickets = [
        createMockTicket({ id: 't1', title: 'Ticket 1' }),
        createMockTicket({ id: 't2', title: 'Ticket 2' }),
      ];
      ticketRepository.create.mockImplementation((t) => Promise.resolve(t));
      ticketRepository.findAll.mockResolvedValue(tickets);

      await createHandler.execute(
        new CreateTicketCommand('c1', 'Ticket 1', 'Desc 1'),
      );
      await createHandler.execute(
        new CreateTicketCommand('c2', 'Ticket 2', 'Desc 2'),
      );

      const allTickets = await listHandler.execute(new ListTicketsQuery());

      expect(allTickets).toHaveLength(2);
      expect(ticketRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('Create → Analyze Pipeline', () => {
    it('should create a ticket and then analyze it', async () => {
      const createdTicket = createMockTicket({ id: 'analyze-pipeline-1' });
      const analysis = createMockAnalysis({ ticketId: 'analyze-pipeline-1' });

      ticketRepository.create.mockResolvedValue(createdTicket);
      ticketRepository.findById.mockResolvedValue(createdTicket);
      ticketRepository.update.mockResolvedValue(createdTicket);
      aiProvider.analyzeTicket.mockResolvedValue(analysis);

      const ticket = await createHandler.execute(
        new CreateTicketCommand('c1', 'Issue', 'Desc'),
      );

      const result = await analyzeHandler.execute(
        new AnalyzeTicketCommand(ticket.id),
      );

      expect(result.category).toBeDefined();
      expect(result.priority).toBeDefined();
      expect(ticketRepository.update).toHaveBeenCalledWith(ticket.id, {
        status: TicketStatus.ANALYZED,
      });
      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledWith(
        ticket.id,
        TicketStatus.ANALYZED,
      );
    });

    it('should complete the full lifecycle: create → analyze → query', async () => {
      const ticketId = 'full-lifecycle-1';
      const createdTicket = createMockTicket({ id: ticketId });
      const analysis = createMockAnalysis({ ticketId });

      ticketRepository.create.mockResolvedValue(createdTicket);
      ticketRepository.findById
        .mockResolvedValueOnce(createdTicket)
        .mockResolvedValueOnce({
          ...createdTicket,
          status: TicketStatus.ANALYZED,
          priority: analysis.priority,
          category: analysis.category,
          sentiment: analysis.sentiment,
          confidence: analysis.confidence,
          suggestedResponse: analysis.suggestedResponse,
        });
      ticketRepository.update.mockResolvedValue(createdTicket);
      aiProvider.analyzeTicket.mockResolvedValue(analysis);

      const ticket = await createHandler.execute(
        new CreateTicketCommand('c1', 'Issue', 'Desc'),
      );
      expect(ticket.status).toBe(TicketStatus.PROCESSING);

      await analyzeHandler.execute(new AnalyzeTicketCommand(ticket.id));

      const finalTicket = await getHandler.execute(
        new GetTicketQuery(ticket.id),
      );
      expect(finalTicket).toBeDefined();
      expect(finalTicket!.status).toBe(TicketStatus.ANALYZED);
    });
  });

  describe('Create → Analyze (fail) → DLQ → FAILED Pipeline', () => {
    it('should create a ticket, fail analysis, and mark as FAILED via DLQ', async () => {
      const ticketId = 'dlq-pipeline-1';
      const createdTicket = createMockTicket({ id: ticketId });

      // Step 1: Create ticket
      ticketRepository.create.mockResolvedValue(createdTicket);

      const ticket = await createHandler.execute(
        new CreateTicketCommand('c1', 'Issue', 'Desc'),
      );
      expect(ticket.status).toBe(TicketStatus.PROCESSING);

      // Step 2: Simulate DLQ event (as if RabbitMQRetry emitted it)
      await dlqHandler.handleTicketDlq({
        ticketId: ticket.id,
        timestamp: new Date().toISOString(),
      });

      // Step 3: Verify status is FAILED
      expect(ticketRepository.update).toHaveBeenCalledWith(ticketId, {
        status: TicketStatus.FAILED,
      });

      // Step 4: Verify SSE event was emitted
      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledWith(
        ticketId,
        TicketStatus.FAILED,
      );
    });

    it('should complete the full failure lifecycle: create → DLQ → query FAILED', async () => {
      const ticketId = 'full-failure-lifecycle-1';
      const createdTicket = createMockTicket({ id: ticketId });

      // Step 1: Create ticket
      ticketRepository.create.mockResolvedValue(createdTicket);

      const ticket = await createHandler.execute(
        new CreateTicketCommand('c1', 'Issue', 'Desc'),
      );
      expect(ticket.status).toBe(TicketStatus.PROCESSING);

      // Step 2: DLQ event (updates status to FAILED)
      ticketRepository.update.mockResolvedValue({
        ...createdTicket,
        status: TicketStatus.FAILED,
      });

      await dlqHandler.handleTicketDlq({
        ticketId: ticket.id,
        timestamp: new Date().toISOString(),
      });

      // Step 3: Query should return FAILED
      ticketRepository.findById.mockResolvedValue({
        ...createdTicket,
        status: TicketStatus.FAILED,
      });

      const finalTicket = await getHandler.execute(
        new GetTicketQuery(ticket.id),
      );
      expect(finalTicket).toBeDefined();
      expect(finalTicket!.status).toBe(TicketStatus.FAILED);
    });
  });

  describe('Query Filters', () => {
    it('should pass filters to repository', async () => {
      ticketRepository.findAll.mockResolvedValue([]);

      await listHandler.execute(
        new ListTicketsQuery({
          status: 'ANALYZED',
          priority: 'HIGH',
          category: 'ORDER',
        }),
      );

      expect(ticketRepository.findAll).toHaveBeenCalledWith({
        status: 'ANALYZED',
        priority: 'HIGH',
        category: 'ORDER',
      });
    });
  });
});
