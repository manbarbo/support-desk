import { Injectable } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';

import { RabbitMQConnection } from './rabbitmq.connection';
import { RabbitMQTopology, RabbitMQQueueConfig } from './rabbitmq.topology';
import { RabbitMQRetry } from './rabbitmq.retry';

@Injectable()
export class RabbitMQConsumer {
  constructor(
    private readonly connection: RabbitMQConnection,
    private readonly topology: RabbitMQTopology,
    private readonly retry: RabbitMQRetry,
  ) {}

  async consume(
    config: RabbitMQQueueConfig,
    handler: (message: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    // IMPORTANTE:
    // Primero aseguramos que exchange + queues + bindings existen.
    await this.topology.setupQueue(config);

    const channel = await this.connection.getChannel();

    await channel.prefetch(1);

    await channel.consume(config.queue, (message) => {
      if (!message) {
        return;
      }

      void this.process(message, handler, config);
    });

    console.log(`Consumer started: ${config.queue}`);
  }

  private async process(
    message: ConsumeMessage,
    handler: (message: ConsumeMessage) => Promise<void>,
    config: RabbitMQQueueConfig,
  ): Promise<void> {
    try {
      await handler(message);
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));

      await this.retry.handleFailure(message, normalizedError, {
        retryQueue: config.retryQueue,
        deadLetterQueue: config.deadLetterQueue,
        originalQueue: config.queue,
      });
    }
  }
}
