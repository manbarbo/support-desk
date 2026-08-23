import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketEventsController } from './ticket-events.controller';
import { TicketUpdatedEvent } from '@domain/events/ticket-updated.event';
import { firstValueFrom } from 'rxjs';

describe('TicketEventsController', () => {
  let controller: TicketEventsController;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    eventEmitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketEventsController,
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    controller = module.get<TicketEventsController>(TicketEventsController);
  });

  afterEach(() => {
    eventEmitter.removeAllListeners();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendTicketEvents', () => {
    it('should return an Observable', () => {
      const result = controller.sendTicketEvents();
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should emit events when ticket.updated is triggered', async () => {
      const observable = controller.sendTicketEvents();

      const promise = firstValueFrom(observable);

      const testEvent = new TicketUpdatedEvent('ticket-123', 'ANALYZED');
      eventEmitter.emit('ticket.updated', testEvent);

      const result = await promise;

      expect(result.type).toBe('ticket.updated');
      expect(result.data).toEqual(testEvent);
    });

    it('should clean up listener on unsubscribe', () => {
      const observable = controller.sendTicketEvents();
      const subscription = observable.subscribe();

      expect(eventEmitter.listenerCount('ticket.updated')).toBe(1);

      subscription.unsubscribe();

      expect(eventEmitter.listenerCount('ticket.updated')).toBe(0);
    });
  });
});
