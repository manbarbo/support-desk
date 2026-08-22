import { DomainEvent } from './domain-event';
import { Ticket } from '../entities/ticket.entity';

export class TicketCreatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ticket.created';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: Record<string, any>;

  constructor(ticket: Ticket) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    this.aggregateId = ticket.id;
    this.payload = {
      id: ticket.id,
      customerId: ticket.customerId,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.createdAt,
    };
  }
}
