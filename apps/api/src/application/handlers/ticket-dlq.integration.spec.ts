import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketDlqHandler } from './ticket-dlq.handler';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import {
  createMockTicket,
  createMockTicketRepository,
  createMockLogger,
} from '../../__mocks__/mocks';

describe('DLQ Pipeline (Integration)', () => {
  let eventEmitter: EventEmitter2;
  let ticketRepository: ReturnType<typeof createMockTicketRepository>;
  let ticketEventEmitter: { emitTicketUpdated: jest.Mock };
  let logger: ReturnType<typeof createMockLogger>;
  let dlqHandler: TicketDlqHandler;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    ticketRepository = createMockTicketRepository();
    ticketEventEmitter = { emitTicketUpdated: jest.fn() };
    logger = createMockLogger();

    dlqHandler = new TicketDlqHandler(
      ticketRepository,
      ticketEventEmitter as any,
      logger,
    );

    // Register the handler to listen for events
    eventEmitter.on('ticket.dlq', (event) => dlqHandler.handleTicketDlq(event));
  });

  afterEach(() => {
    eventEmitter.removeAllListeners();
  });

  describe('EventEmitter2 → TicketDlqHandler → Repository + SSE', () => {
    it('should update ticket status to FAILED when event is emitted', async () => {
      const event = {
        ticketId: 'integration-test-ticket',
        timestamp: new Date().toISOString(),
      };

      // Simulate RabbitMQRetry emitting the event
      eventEmitter.emit('ticket.dlq', event);

      // Wait for async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(ticketRepository.update).toHaveBeenCalledWith(
        'integration-test-ticket',
        { status: TicketStatus.FAILED },
      );
    });

    it('should emit SSE event when ticket status is updated', async () => {
      const event = {
        ticketId: 'sse-test-ticket',
        timestamp: new Date().toISOString(),
      };

      eventEmitter.emit('ticket.dlq', event);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledWith(
        'sse-test-ticket',
        TicketStatus.FAILED,
      );
    });

    it('should handle multiple DLQ events', async () => {
      const events = [
        { ticketId: 'ticket-1', timestamp: new Date().toISOString() },
        { ticketId: 'ticket-2', timestamp: new Date().toISOString() },
        { ticketId: 'ticket-3', timestamp: new Date().toISOString() },
      ];

      for (const event of events) {
        eventEmitter.emit('ticket.dlq', event);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(ticketRepository.update).toHaveBeenCalledTimes(3);
      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledTimes(3);
    });

    it('should continue processing other events if one fails', async () => {
      ticketRepository.update
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(createMockTicket());

      eventEmitter.emit('ticket.dlq', {
        ticketId: 'failing-ticket',
        timestamp: new Date().toISOString(),
      });

      eventEmitter.emit('ticket.dlq', {
        ticketId: 'success-ticket',
        timestamp: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // First call failed, second succeeded
      expect(ticketRepository.update).toHaveBeenCalledTimes(2);
      expect(ticketEventEmitter.emitTicketUpdated).toHaveBeenCalledTimes(1);
    });
  });
});
