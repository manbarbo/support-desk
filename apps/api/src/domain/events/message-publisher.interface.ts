import { DomainEvent } from './domain-event';

export const MESSAGE_PUBLISHER = 'MESSAGE_PUBLISHER';

export interface MessagePublisher {
  publish(event: DomainEvent): Promise<void>;
}
