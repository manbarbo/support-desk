import { CreateTicketHandler } from './create-ticket.handler';
import { AnalyzeTicketHandler } from './analyze-ticket.handler';
import { CreateTicketCommand } from './create-ticket.command';
import { AnalyzeTicketCommand } from './analyze-ticket.command';
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
} from '../../../__mocks__/mocks';

describe('Ticket Pipeline (Integration)', () => {
  let createHandler: CreateTicketHandler;
  let analyzeHandler: AnalyzeTicketHandler;
  let getHandler: GetTicketHandler;
  let listHandler: ListTicketsHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let messagePublisher: ReturnType<typeof createMockMessagePublisher>;
  let aiProvider: ReturnType<typeof createMockAIProvider>;
  let ticketEventEmitter: { emitTicketUpdated: jest.Mock };

  beforeAll(() => {
    ticketRepository = createMockTicketRepository();
    messagePublisher = createMockMessagePublisher();
    aiProvider = createMockAIProvider();
    ticketEventEmitter = { emitTicketUpdated: jest.fn() };

    createHandler = new CreateTicketHandler(ticketRepository, messagePublisher);
    analyzeHandler = new AnalyzeTicketHandler(
      ticketRepository,
      aiProvider,
      ticketEventEmitter as any,
    );
    getHandler = new GetTicketHandler(ticketRepository);
    listHandler = new ListTicketsHandler(ticketRepository);
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
        new CreateTicketCommand('customer-1', 'Order issue', 'My order is late'),
      );

      expect(ticket.id).toBe('pipeline-ticket-1');

      const found = await getHandler.execute(new GetTicketQuery('pipeline-ticket-1'));

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
