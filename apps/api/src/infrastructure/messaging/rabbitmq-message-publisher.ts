import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { MessagePublisher } from '@domain/events/message-publisher.interface';
import type { DomainEvent } from '@domain/events/domain-event';

@Injectable()
export class RabbitMQMessagePublisher
  implements MessagePublisher, OnModuleInit, OnModuleDestroy
{
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  private readonly exchange = 'support.events';
  private readonly rabbitmqUrl: string;

  constructor(private readonly configService: ConfigService) {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');

    if (!rabbitmqUrl) {
      throw new Error('RABBITMQ_URL is not configured');
    }

    this.rabbitmqUrl = rabbitmqUrl;
  }

  async onModuleInit() {
    await this.connect();
    await this.setupTopology();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    console.log(`Exchange '${this.exchange}' is ready`);
  }

  publish(event: DomainEvent): void {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const message = Buffer.from(JSON.stringify(event));

    const published = this.channel.publish(
      this.exchange,
      event.eventType,
      message,
      {
        persistent: true,
        contentType: 'application/json',
      },
    );

    if (!published) {
      console.warn(`RabbitMQ buffer is full for event ${event.eventId}`);
    }

    console.log(`Published event: ${event.eventType} (${event.eventId})`);
  }

  private async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } finally {
      this.channel = undefined;
      this.connection = undefined;
    }
  }
}
