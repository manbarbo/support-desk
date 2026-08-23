import { AnalyzeTicketHandler } from './analyze-ticket.handler';
import { AnalyzeTicketCommand } from './analyze-ticket.command';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import {
  createMockTicket,
  createMockAnalysis,
  createMockTicketRepository,
  createMockAIProvider,
  createMockLogger,
} from '../../../__mocks__/mocks';

describe('AnalyzeTicketHandler (Integration)', () => {
  let handler: AnalyzeTicketHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let aiProvider: ReturnType<typeof createMockAIProvider>;
  let ticketEventEmitter: { emitTicketUpdated: jest.Mock };
  let logger: ReturnType<typeof createMockLogger>;

  beforeAll(() => {
    ticketRepository = createMockTicketRepository();
    aiProvider = createMockAIProvider();
    ticketEventEmitter = { emitTicketUpdated: jest.fn() };
    logger = createMockLogger();
    handler = new AnalyzeTicketHandler(
      ticketRepository,
      aiProvider,
      ticketEventEmitter as any,
      logger,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should analyze a ticket through the handler', async () => {
    ticketRepository.findById.mockResolvedValue(createMockTicket());
    aiProvider.analyzeTicket.mockResolvedValue(createMockAnalysis());

    const result = await handler.execute(
      new AnalyzeTicketCommand('test-ticket-id'),
    );

    expect(result).toMatchObject({
      category: expect.any(String),
      priority: expect.any(String),
      sentiment: expect.any(String),
    });
  });

  it('should update repository and emit event through the pipeline', async () => {
    ticketRepository.findById.mockResolvedValue(createMockTicket());
    aiProvider.analyzeTicket.mockResolvedValue(createMockAnalysis());

    await handler.execute(new AnalyzeTicketCommand('ticket-123'));

    expect(ticketRepository.findById).toHaveBeenCalledWith('ticket-123');
    expect(ticketRepository.updateAnalysis).toHaveBeenCalled();
    expect(ticketRepository.update).toHaveBeenCalledWith('ticket-123', {
      status: TicketStatus.ANALYZED,
    });
    expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledWith(
      'ticket-123',
      TicketStatus.ANALYZED,
    );
  });

  it('should throw when ticket does not exist', async () => {
    ticketRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new AnalyzeTicketCommand('nonexistent')),
    ).rejects.toThrow('Ticket not found: nonexistent');
  });

  it('should propagate AI provider errors', async () => {
    ticketRepository.findById.mockResolvedValue(createMockTicket());
    aiProvider.analyzeTicket.mockRejectedValue(new Error('AI timeout'));

    await expect(
      handler.execute(new AnalyzeTicketCommand('ticket-123')),
    ).rejects.toThrow('AI timeout');
  });

  it('should log analysis start', async () => {
    ticketRepository.findById.mockResolvedValue(createMockTicket());
    aiProvider.analyzeTicket.mockResolvedValue(createMockAnalysis());

    await handler.execute(new AnalyzeTicketCommand('ticket-123'));

    expect(logger.info).toHaveBeenCalledWith(
      'Starting ticket analysis',
      expect.objectContaining({
        context: 'AnalyzeTicketHandler',
        ticketId: 'ticket-123',
      }),
    );
  });

  it('should call methods in correct order', async () => {
    const callOrder: string[] = [];

    ticketRepository.findById.mockImplementation(() => {
      callOrder.push('findById');
      return Promise.resolve(createMockTicket());
    });

    aiProvider.analyzeTicket.mockImplementation(() => {
      callOrder.push('analyzeTicket');
      return Promise.resolve(createMockAnalysis());
    });

    ticketRepository.updateAnalysis.mockImplementation(() => {
      callOrder.push('updateAnalysis');
      return Promise.resolve();
    });

    ticketRepository.update.mockImplementation(() => {
      callOrder.push('update');
      return Promise.resolve(createMockTicket());
    });

    ticketEventEmitter.emitTicketUpdated.mockImplementation(() => {
      callOrder.push('emitTicketUpdated');
    });

    await handler.execute(new AnalyzeTicketCommand('ticket-123'));

    expect(callOrder).toEqual([
      'findById',
      'analyzeTicket',
      'updateAnalysis',
      'update',
      'emitTicketUpdated',
    ]);
  });
});
