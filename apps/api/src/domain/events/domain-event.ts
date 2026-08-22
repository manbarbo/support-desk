export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  aggregateId: string;
  payload: Record<string, any>;
}
