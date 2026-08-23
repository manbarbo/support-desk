import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQConnection implements OnModuleDestroy {
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  private connectionPromise?: Promise<amqp.Channel>;

  private readonly brokerUrl: string;

  constructor(private readonly configService: ConfigService) {
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
    console.log('Connecting to RabbitMQ...');

    this.connection = await amqp.connect(this.brokerUrl);

    this.channel = await this.connection.createChannel();

    console.log('Connected to RabbitMQ');

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
