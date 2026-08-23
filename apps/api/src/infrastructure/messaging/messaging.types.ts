export interface MessageQueueConfig {
  queue: string;
  routingKey: string;
  retryQueue?: string;
  deadLetterQueue?: string;
  durable?: boolean;
  autoDelete?: boolean;
}

export interface MessageExchangeConfig {
  name: string;
  type: 'topic' | 'direct' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
}
