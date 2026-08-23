import { DomainEvent } from './domain-event';

export class TicketUpdatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ticket.updated';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: Record<string, any>;

  constructor(ticketId: string, status: string) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    this.aggregateId = ticketId;
    this.payload = {
      ticketId,
      status,
    };
  }
}
