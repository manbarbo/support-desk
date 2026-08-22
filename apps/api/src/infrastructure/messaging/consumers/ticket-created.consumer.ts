import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import * as amqp from 'amqplib';
import { AnalyzeTicketCommand } from '@application/commands/tickets/analyze-ticket.command';
import { DomainEvent } from '@domain/events/domain-event';

@Injectable()
export class TicketCreatedConsumer implements OnModuleInit, OnModuleDestroy {
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  private readonly exchange = 'support.events';
  private readonly queue = 'ticket.ai.processing';
  private readonly retryQueue = 'ticket.ai.processing.retry';
  private readonly dlq = 'ticket.ai.processing.dlq';
  private readonly routingKey = 'ticket.created';
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;
  private readonly brokerUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
  ) {
    const brokerUrl = this.configService.get<string>('BROKER_URL');

    if (!brokerUrl) {
      throw new Error('BROKER_URL is not configured');
    }

    this.brokerUrl = brokerUrl;
    this.maxRetries = parseInt(
      this.configService.get<string>('BROKER_MAX_RETRIES') || '3',
      10,
    );
    this.retryBaseDelay = parseInt(
      this.configService.get<string>('BROKER_RETRY_BASE_DELAY') || '5000',
      10,
    );
  }

  async onModuleInit() {
    await this.connect();
    await this.setupTopology();
    await this.startConsuming();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.brokerUrl);
      this.channel = await this.connection.createChannel();

      console.log('TicketCreatedConsumer connected to RabbitMQ');
    } catch (error) {
      console.error(
        'Failed to connect TicketCreatedConsumer to RabbitMQ:',
        error,
      );
      throw error;
    }
  }

  private async setupTopology(): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    // Exchange principal
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    // Main queue
    await this.channel.assertQueue(this.queue, {
      durable: true,
      autoDelete: false,
    });

    // Retry queue
    // Los mensajes permanecen aquí hasta que expire su TTL.
    // Cuando expiran, RabbitMQ los envía nuevamente a la main queue.
    await this.channel.assertQueue(this.retryQueue, {
      durable: true,
      autoDelete: false,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': this.queue,
      },
    });

    // DLQ
    await this.channel.assertQueue(this.dlq, {
      durable: true,
      autoDelete: false,
    });

    // Main queue recibe ticket.created
    await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);

    console.log('Topology configured:');
    console.log(`  - Exchange: ${this.exchange}`);
    console.log(`  - Main queue: ${this.queue}`);
    console.log(`  - Retry queue: ${this.retryQueue}`);
    console.log(`  - DLQ: ${this.dlq}`);
  }

  private async startConsuming(): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    // Configurar prefetch para procesar un mensaje a la vez
    await this.channel.prefetch(1);

    // Consumir mensajes de la cola
    await this.channel.consume(this.queue, (message) => {
      if (!message) {
        return;
      }

      void this.processMessage(message);
    });

    console.log(
      `TicketCreatedConsumer started consuming from queue '${this.queue}'`,
    );
  }

  private async processMessage(message: amqp.ConsumeMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    try {
      const content = message.content.toString();

      const event = JSON.parse(content) as DomainEvent;

      const retryCount = this.getRetryCount(message);

      console.log(
        `Received event: ${event.eventType} (${event.eventId}) - Attempt ${retryCount + 1}/${this.maxRetries + 1}`,
      );

      const command = new AnalyzeTicketCommand(event.aggregateId);

      await this.commandBus.execute(command);

      this.channel.ack(message);

      console.log(`Successfully processed event: ${event.eventId}`);
    } catch (error) {
      console.error('Failed to process message:', error);

      this.handleFailedMessage(
        message,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private handleFailedMessage(
    message: amqp.ConsumeMessage,
    error: Error,
  ): void {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const retryCount = this.getRetryCount(message);
    const content = message.content.toString();

    if (retryCount < this.maxRetries) {
      const newRetryCount = retryCount + 1;
      const delay = this.calculateBackoff(newRetryCount);

      console.log(
        `Retrying message ` +
          `(attempt ${newRetryCount}/${this.maxRetries}) ` +
          `after ${delay}ms`,
      );

      const published = this.channel.sendToQueue(
        this.retryQueue,
        Buffer.from(content),
        {
          persistent: true,
          expiration: delay.toString(),
          contentType: 'application/json',
          headers: {
            'x-retry-count': newRetryCount,
            'x-last-error': error.message,
            'x-last-error-at': new Date().toISOString(),
            'x-original-queue': this.queue,
          },
        },
      );

      if (!published) {
        console.error('Failed to publish message to retry queue');

        return;
      }

      // El mensaje original ya está almacenado
      // en la retry queue.
      this.channel.ack(message);

      return;
    }

    console.error(
      `Max retries (${this.maxRetries}) reached. ` +
        `Moving to DLQ: ${this.dlq}`,
    );

    const published = this.channel.sendToQueue(this.dlq, Buffer.from(content), {
      persistent: true,
      contentType: 'application/json',
      headers: {
        'x-retry-count': retryCount,
        'x-last-error': error.message,
        'x-last-error-at': new Date().toISOString(),
        'x-original-queue': this.queue,
      },
    });

    if (!published) {
      console.error('Failed to publish message to DLQ');

      return;
    }

    this.channel.ack(message);
  }

  private calculateBackoff(retryCount: number): number {
    const baseDelay = this.retryBaseDelay;
    const multiplier = Math.pow(5, retryCount - 1);

    const delay = baseDelay * multiplier;

    return Math.min(delay, 5 * 60 * 1000); // Máximo 5 minutos
  }

  private getRetryCount(message: amqp.ConsumeMessage): number {
    const value: unknown = message.properties.headers?.['x-retry-count'];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
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
