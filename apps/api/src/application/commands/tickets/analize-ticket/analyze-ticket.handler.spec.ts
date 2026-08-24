import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzeTicketHandler } from './analyze-ticket.handler';
import { AnalyzeTicketCommand } from './analyze-ticket.command';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { AI_PROVIDER } from '@application/ports/ai-provider.interface';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { TicketEventEmitterService } from '@application/services/ticket-event-emitter.service';
import {
  createMockTicket,
  createMockAnalysis,
  createMockTicketRepository,
  createMockAIProvider,
  createMockLogger,
} from '../../../../__mocks__/mocks';

describe('AnalyzeTicketHandler', () => {
  let handler: AnalyzeTicketHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let aiProvider: ReturnType<typeof createMockAIProvider>;
  let ticketEventEmitter: { emitTicketUpdated: jest.Mock };
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    ticketRepository = createMockTicketRepository();
    aiProvider = createMockAIProvider();
    ticketEventEmitter = { emitTicketUpdated: jest.fn() };
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyzeTicketHandler,
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
        { provide: AI_PROVIDER, useValue: aiProvider },
        { provide: TicketEventEmitterService, useValue: ticketEventEmitter },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get<AnalyzeTicketHandler>(AnalyzeTicketHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const command = new AnalyzeTicketCommand('test-ticket-id-123');

    beforeEach(() => {
      ticketRepository.findById.mockResolvedValue(createMockTicket());
      aiProvider.analyzeTicket.mockResolvedValue(createMockAnalysis());
    });

    it('should retrieve the ticket by id', async () => {
      await handler.execute(command);

      expect(ticketRepository.findById).toHaveBeenCalledWith(
        'test-ticket-id-123',
      );
    });

    it('should throw if ticket is not found', async () => {
      ticketRepository.findById.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(
        'Ticket not found: test-ticket-id-123',
      );
    });

    it('should call AI provider with the ticket', async () => {
      const mockTicket = createMockTicket();
      ticketRepository.findById.mockResolvedValue(mockTicket);

      await handler.execute(command);

      expect(aiProvider.analyzeTicket).toHaveBeenCalledWith(mockTicket);
    });

    it('should persist the analysis results', async () => {
      const mockAnalysis = createMockAnalysis();
      aiProvider.analyzeTicket.mockResolvedValue(mockAnalysis);

      await handler.execute(command);

      expect(ticketRepository.updateAnalysis).toHaveBeenCalledWith(
        'test-ticket-id-123',
        {
          category: mockAnalysis.category,
          priority: mockAnalysis.priority,
          sentiment: mockAnalysis.sentiment,
          confidence: mockAnalysis.confidence,
          suggestedResponse: mockAnalysis.suggestedResponse,
        },
      );
    });

    it('should update ticket status to ANALYZED', async () => {
      await handler.execute(command);

      expect(ticketRepository.update).toHaveBeenCalledWith(
        'test-ticket-id-123',
        {
          status: TicketStatus.ANALYZED,
        },
      );
    });

    it('should emit ticket.updated event for SSE', async () => {
      await handler.execute(command);

      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledWith(
        'test-ticket-id-123',
        TicketStatus.ANALYZED,
      );
    });

    it('should return the analysis result', async () => {
      const mockAnalysis = createMockAnalysis();
      aiProvider.analyzeTicket.mockResolvedValue(mockAnalysis);

      const result = await handler.execute(command);

      expect(result).toEqual(mockAnalysis);
    });

    it('should propagate AI provider errors', async () => {
      aiProvider.analyzeTicket.mockRejectedValue(new Error('AI API timeout'));

      await expect(handler.execute(command)).rejects.toThrow('AI API timeout');
    });

    it('should propagate repository errors', async () => {
      ticketRepository.update.mockRejectedValue(
        new Error('Database write failed'),
      );

      await expect(handler.execute(command)).rejects.toThrow(
        'Database write failed',
      );
    });

    it('should log analysis start', async () => {
      await handler.execute(command);

      expect(logger.info).toHaveBeenCalledWith(
        'Starting ticket analysis',
        expect.objectContaining({
          context: 'AnalyzeTicketHandler',
          ticketId: 'test-ticket-id-123',
        }),
      );
    });

    it('should log analysis completion', async () => {
      await handler.execute(command);

      expect(logger.info).toHaveBeenCalledWith(
        'AI analysis completed',
        expect.objectContaining({
          context: 'AnalyzeTicketHandler',
          category: expect.any(String),
          priority: expect.any(String),
        }),
      );
    });

    it('should log when ticket not found', async () => {
      ticketRepository.findById.mockResolvedValue(null);

      try {
        await handler.execute(command);
      } catch {
        // expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Ticket not found for analysis',
        expect.objectContaining({
          context: 'AnalyzeTicketHandler',
          ticketId: 'test-ticket-id-123',
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

      await handler.execute(command);

      expect(callOrder).toEqual([
        'findById',
        'analyzeTicket',
        'updateAnalysis',
        'update',
        'emitTicketUpdated',
      ]);
    });
  });
});
