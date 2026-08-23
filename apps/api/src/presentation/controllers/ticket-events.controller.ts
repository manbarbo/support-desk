import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketUpdatedEvent } from '@domain/events/ticket-updated.event';

@Controller()
export class TicketEventsController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('events/tickets/stream')
  sendTicketEvents(): Observable<{ type: string; data: TicketUpdatedEvent }> {
    return new Observable((subscriber) => {
      const handler = (event: TicketUpdatedEvent) => {
        subscriber.next({
          type: event.eventType,
          data: event,
        });
      };

      this.eventEmitter.on('ticket.updated', handler);

      return () => {
        this.eventEmitter.off('ticket.updated', handler);
      };
    });
  }
}
