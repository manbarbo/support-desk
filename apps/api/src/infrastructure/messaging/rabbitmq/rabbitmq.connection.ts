import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

@Injectable()
export class RabbitMQConnection implements OnModuleDestroy {
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  private connectionPromise?: Promise<amqp.Channel>;

  private readonly brokerUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    const brokerUrl = this.configService.get<string>('BROKER_URL');

    if (!brokerUrl) {
      throw new Error('BROKER_URL is not configured');
    }

    this.brokerUrl = brokerUrl;
  }

  async getChannel(): Promise<amqp.Channel> {
    if (this.channel) {
      return this.channel;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.createConnection();

    try {
      return await this.connectionPromise;
    } finally {
      this.connectionPromise = undefined;
    }
  }

  private async createConnection(): Promise<amqp.Channel> {
    this.logger.info('Connecting to RabbitMQ', {
      context: 'RabbitMQConnection',
    });

    this.connection = await amqp.connect(this.brokerUrl);

    this.channel = await this.connection.createChannel();

    this.logger.info('Connected to RabbitMQ', {
      context: 'RabbitMQConnection',
    });

    return this.channel;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } finally {
      this.channel = undefined;
      this.connection = undefined;
      this.connectionPromise = undefined;
    }
  }
}
