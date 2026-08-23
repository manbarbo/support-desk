import { Injectable } from '@nestjs/common';
import type { Channel, ConsumeMessage } from 'amqplib';

import { RabbitMQConnection } from './rabbitmq.connection';
import { RabbitMQTopology } from './rabbitmq.topology';
import { RabbitMQRetry } from './rabbitmq.retry';
import type {
  MessageQueueConfig,
  MessageExchangeConfig,
} from '../messaging.types';

@Injectable()
export class RabbitMQConsumer {
  constructor(
    private readonly connection: RabbitMQConnection,
    private readonly topology: RabbitMQTopology,
    private readonly retry: RabbitMQRetry,
  ) {}

  async consume(
    config: MessageQueueConfig,
    exchange: MessageExchangeConfig,
    handler: (message: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    // IMPORTANTE:
    // Primero aseguramos que exchange + queues + bindings existen.
    await this.topology.setupQueue(config, exchange);

    const channel = await this.connection.getChannel();

    await channel.prefetch(1);

    await channel.consume(config.queue, (message) => {
      if (!message) {
        return;
      }

      void this.process(channel, message, handler, config);
    });

    console.log(`Consumer started: ${config.queue}`);
  }

  private async process(
    channel: Channel,
    message: ConsumeMessage,
    handler: (message: ConsumeMessage) => Promise<void>,
    config: MessageQueueConfig,
  ): Promise<void> {
    try {
      await handler(message);

      this.ackSafely(channel, message, config.queue);
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));

      await this.handleFailureSafely(channel, message, normalizedError, config);
    }
  }

  private ackSafely(
    channel: Channel,
    message: ConsumeMessage,
    queueName: string,
  ): void {
    try {
      channel.ack(message);

      console.log(`Message acknowledged from queue: ${queueName}`);
    } catch (ackError) {
      const errorMessage =
        ackError instanceof Error ? ackError.message : String(ackError);

      console.error(
        `Failed to acknowledge message from queue ${queueName}: ${errorMessage}`,
      );
    }
  }

  private async handleFailureSafely(
    channel: Channel,
    message: ConsumeMessage,
    error: Error,
    config: MessageQueueConfig,
  ): Promise<void> {
    try {
      await this.retry.handleFailure(message, error, {
        retryQueue: config.retryQueue,
        deadLetterQueue: config.deadLetterQueue,
        originalQueue: config.queue,
      });
    } catch (retryError) {
      const errorMessage =
        retryError instanceof Error ? retryError.message : String(retryError);

      console.error(
        `Failed to handle message failure for queue ${config.queue}: ${errorMessage}. ` +
          `Falling back to nack without requeue.`,
      );

      try {
        channel.nack(message, false, false);
      } catch (nackError) {
        const nackErrorMessage =
          nackError instanceof Error ? nackError.message : String(nackError);

        console.error(
          `Critical: Failed to nack message from queue ${config.queue}: ${nackErrorMessage}. ` +
            `Message may remain unacknowledged and could be redelivered.`,
        );
      }
    }
  }
}
