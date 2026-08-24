import { Test, TestingModule } from '@nestjs/testing';
import { TicketDlqHandler } from './ticket-dlq.handler';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { TicketEventEmitterService } from '@application/services/ticket-event-emitter.service';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import {
  createMockTicketRepository,
  createMockLogger,
} from '../../__mocks__/mocks';

describe('TicketDlqHandler', () => {
  let handler: TicketDlqHandler;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let ticketEventEmitter: { emitTicketUpdated: jest.Mock };
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    ticketRepository = createMockTicketRepository();
    ticketEventEmitter = { emitTicketUpdated: jest.fn() };
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketDlqHandler,
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
        { provide: TicketEventEmitterService, useValue: ticketEventEmitter },
        { provide: LOGGER, useValue: logger },
      ],
    }).compile();

    handler = module.get<TicketDlqHandler>(TicketDlqHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('handleTicketDlq', () => {
    const mockEvent = {
      ticketId: 'test-ticket-123',
      timestamp: '2026-08-24T00:00:00.000Z',
    };

    it('should update ticket status to FAILED', async () => {
      await handler.handleTicketDlq(mockEvent);

      expect(ticketRepository.update).toHaveBeenCalledWith('test-ticket-123', {
        status: TicketStatus.FAILED,
      });
    });

    it('should emit SSE event for frontend update', async () => {
      await handler.handleTicketDlq(mockEvent);

      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledWith(
        'test-ticket-123',
        TicketStatus.FAILED,
      );
    });

    it('should log the DLQ event', async () => {
      await handler.handleTicketDlq(mockEvent);

      expect(logger.info).toHaveBeenCalledWith(
        'Ticket moved to DLQ, updating status to FAILED',
        expect.objectContaining({
          context: 'TicketDlqHandler',
          ticketId: 'test-ticket-123',
        }),
      );
    });

    it('should log success after updating', async () => {
      await handler.handleTicketDlq(mockEvent);

      expect(logger.info).toHaveBeenCalledWith(
        'Ticket status updated to FAILED',
        expect.objectContaining({
          context: 'TicketDlqHandler',
          ticketId: 'test-ticket-123',
        }),
      );
    });

    it('should handle repository errors gracefully', async () => {
      ticketRepository.update.mockRejectedValue(new Error('DB error'));

      await handler.handleTicketDlq(mockEvent);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update ticket status to FAILED',
        expect.objectContaining({
          context: 'TicketDlqHandler',
          ticketId: 'test-ticket-123',
          error: 'DB error',
        }),
      );
    });

    it('should not emit SSE event if repository fails', async () => {
      ticketRepository.update.mockRejectedValue(new Error('DB error'));

      await handler.handleTicketDlq(mockEvent);

      expect(ticketEventEmitter.emitTicketUpdated).not.toHaveBeenCalled();
    });
  });
});
