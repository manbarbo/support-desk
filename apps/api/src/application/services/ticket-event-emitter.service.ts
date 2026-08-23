import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TicketUpdatedEvent } from '@domain/events/ticket-updated.event';

@Injectable()
export class TicketEventEmitterService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitTicketUpdated(ticketId: string, status: string): void {
    const event = new TicketUpdatedEvent(ticketId, status);

    this.eventEmitter.emit(event.eventType, event);
  }
}
