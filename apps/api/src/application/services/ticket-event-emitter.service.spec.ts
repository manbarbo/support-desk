import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketEventEmitterService } from './ticket-event-emitter.service';

describe('TicketEventEmitterService', () => {
  let service: TicketEventEmitterService;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketEventEmitterService,
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TicketEventEmitterService>(TicketEventEmitterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emitTicketUpdated', () => {
    it('should emit a ticket.updated event with correct data', () => {
      service.emitTicketUpdated('ticket-123', 'ANALYZED');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ticket.updated',
        expect.objectContaining({
          eventType: 'ticket.updated',
          aggregateId: 'ticket-123',
          payload: expect.objectContaining({
            ticketId: 'ticket-123',
            status: 'ANALYZED',
          }),
        }),
      );
    });

    it('should emit event with different statuses', () => {
      service.emitTicketUpdated('ticket-456', 'FAILED');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'ticket.updated',
        expect.objectContaining({
          payload: expect.objectContaining({
            ticketId: 'ticket-456',
            status: 'FAILED',
          }),
        }),
      );
    });

    it('should generate a unique eventId for each emission', () => {
      service.emitTicketUpdated('ticket-1', 'ANALYZED');
      service.emitTicketUpdated('ticket-2', 'ANALYZED');

      const event1 = eventEmitter.emit.mock.calls[0][1];
      const event2 = eventEmitter.emit.mock.calls[1][1];

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should include a timestamp', () => {
      const before = new Date();
      service.emitTicketUpdated('ticket-123', 'ANALYZED');
      const after = new Date();

      const event = eventEmitter.emit.mock.calls[0][1];
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
