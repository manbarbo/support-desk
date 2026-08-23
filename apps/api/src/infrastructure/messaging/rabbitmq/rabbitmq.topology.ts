import { Inject, Injectable } from '@nestjs/common';
import type { Channel } from 'amqplib';

import { RabbitMQConnection } from './rabbitmq.connection';
import type { MessageQueueConfig, MessageExchangeConfig } from '../messaging.types';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

@Injectable()
export class RabbitMQTopology {
  constructor(
    private readonly connection: RabbitMQConnection,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async setupQueue(
    config: MessageQueueConfig,
    exchange: MessageExchangeConfig,
  ): Promise<void> {
    const channel = await this.connection.getChannel();

    await this.setupExchange(channel, exchange);

    await this.setupMainQueue(channel, config);

    if (config.retryQueue) {
      await this.setupRetryQueue(channel, config);
    }

    if (config.deadLetterQueue) {
      await this.setupDeadLetterQueue(channel, config);
    }

    await this.setupBindings(channel, config, exchange.name);

    this.logger.info('RabbitMQ topology ready', {
      context: 'RabbitMQTopology',
      queue: config.queue,
      exchange: exchange.name,
    });
  }

  private async setupExchange(
    channel: Channel,
    exchange: MessageExchangeConfig,
  ): Promise<void> {
    await channel.assertExchange(exchange.name, exchange.type, {
      durable: exchange.durable ?? true,
    });
  }

  private async setupMainQueue(
    channel: Channel,
    config: MessageQueueConfig,
  ): Promise<void> {
    await channel.assertQueue(config.queue, {
      durable: config.durable ?? true,
      autoDelete: config.autoDelete ?? false,
    });
  }

  private async setupRetryQueue(
    channel: Channel,
    config: MessageQueueConfig,
  ): Promise<void> {
    if (!config.retryQueue) return;

    await channel.assertQueue(config.retryQueue, {
      durable: config.durable ?? true,
      autoDelete: config.autoDelete ?? false,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': config.queue,
      },
    });
  }

  private async setupDeadLetterQueue(
    channel: Channel,
    config: MessageQueueConfig,
  ): Promise<void> {
    if (!config.deadLetterQueue) return;

    await channel.assertQueue(config.deadLetterQueue, {
      durable: config.durable ?? true,
      autoDelete: config.autoDelete ?? false,
    });
  }

  private async setupBindings(
    channel: Channel,
    config: MessageQueueConfig,
    exchangeName: string,
  ): Promise<void> {
    await channel.bindQueue(config.queue, exchangeName, config.routingKey);
  }
}
