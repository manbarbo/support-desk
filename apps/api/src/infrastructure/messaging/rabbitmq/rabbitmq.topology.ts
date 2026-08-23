import { Injectable } from '@nestjs/common';
import type { Channel } from 'amqplib';

import { RabbitMQConnection } from './rabbitmq.connection';

export interface RabbitMQQueueConfig {
  queue: string;
  retryQueue: string;
  deadLetterQueue: string;
  routingKey: string;
}

@Injectable()
export class RabbitMQTopology {
  private readonly exchange = 'support.events';

  constructor(private readonly connection: RabbitMQConnection) {}

  async setupQueue(config: RabbitMQQueueConfig): Promise<void> {
    const channel = await this.connection.getChannel();

    await this.setupExchange(channel);

    await this.setupMainQueue(channel, config);

    await this.setupRetryQueue(channel, config);

    await this.setupDeadLetterQueue(channel, config);

    await this.setupBindings(channel, config);

    console.log(`RabbitMQ topology ready for queue '${config.queue}'`);
  }

  private async setupExchange(channel: Channel): Promise<void> {
    await channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
  }

  private async setupMainQueue(
    channel: Channel,
    config: RabbitMQQueueConfig,
  ): Promise<void> {
    await channel.assertQueue(config.queue, {
      durable: true,
      autoDelete: false,
    });
  }

  private async setupRetryQueue(
    channel: Channel,
    config: RabbitMQQueueConfig,
  ): Promise<void> {
    await channel.assertQueue(config.retryQueue, {
      durable: true,
      autoDelete: false,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': config.queue,
      },
    });
  }

  private async setupDeadLetterQueue(
    channel: Channel,
    config: RabbitMQQueueConfig,
  ): Promise<void> {
    await channel.assertQueue(config.deadLetterQueue, {
      durable: true,
      autoDelete: false,
    });
  }

  private async setupBindings(
    channel: Channel,
    config: RabbitMQQueueConfig,
  ): Promise<void> {
    await channel.bindQueue(config.queue, this.exchange, config.routingKey);
  }
}
