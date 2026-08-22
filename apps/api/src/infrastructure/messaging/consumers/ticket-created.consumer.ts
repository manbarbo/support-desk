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
  private readonly routingKey = 'ticket.created';
  private readonly rabbitmqUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
  ) {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');

    if (!rabbitmqUrl) {
      throw new Error('RABBITMQ_URL is not configured');
    }

    this.rabbitmqUrl = rabbitmqUrl;
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
      this.connection = await amqp.connect(this.rabbitmqUrl);
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

    // Asegurar que el exchange existe
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    // Asegurar que la cola existe
    await this.channel.assertQueue(this.queue, {
      durable: true,
      autoDelete: false,
    });

    // Enlazar la cola al exchange con el routing key
    await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);

    console.log(
      `Queue '${this.queue}' bound to exchange '${this.exchange}' with routing key '${this.routingKey}'`,
    );
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
      const event: DomainEvent = JSON.parse(content) as DomainEvent;
      const command = new AnalyzeTicketCommand(event.aggregateId);

      console.log(`Received event: ${event.eventType} (${event.eventId})`);

      await this.commandBus.execute(command);

      this.channel.ack(message);

      console.log(`Successfully processed event: ${event.eventId}`);
    } catch (error) {
      console.error('Failed to process message:', error);

      this.channel.nack(message, false, true);
    }
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
