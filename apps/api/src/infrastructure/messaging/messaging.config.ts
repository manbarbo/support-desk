import type {
  MessageQueueConfig,
  MessageExchangeConfig,
} from './messaging.types';

export const SUPPORT_EVENTS_EXCHANGE: MessageExchangeConfig = {
  name: 'support.events',
  type: 'topic',
  durable: true,
};

export const TICKET_CREATED_QUEUE: MessageQueueConfig = {
  queue: 'ticket.ai.processing',
  retryQueue: 'ticket.ai.processing.retry',
  deadLetterQueue: 'ticket.ai.processing.dlq',
  routingKey: 'ticket.created',
};
