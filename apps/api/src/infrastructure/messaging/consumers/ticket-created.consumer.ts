import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { ConsumeMessage } from 'amqplib';

import { AnalyzeTicketCommand } from '@application/commands/tickets/analyze-ticket.command';
import { RabbitMQConsumer } from '../rabbitmq/rabbitmq.consumer';
import type { DomainEvent } from '@domain/events/domain-event';

@Injectable()
export class TicketCreatedConsumer implements OnModuleInit {
  constructor(
    private readonly consumer: RabbitMQConsumer,
    private readonly commandBus: CommandBus,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.consume(
      {
        queue: 'ticket.ai.processing',
        retryQueue: 'ticket.ai.processing.retry',
        deadLetterQueue: 'ticket.ai.processing.dlq',
        routingKey: 'ticket.created',
      },
      async (message: ConsumeMessage) => {
        await this.processMessage(message);
      },
    );
  }

  private async processMessage(message: ConsumeMessage): Promise<void> {
    const content = message.content.toString();

    const event = JSON.parse(content) as DomainEvent;

    console.log(`Received event: ${event.eventType} (${event.eventId})`);

    const command = new AnalyzeTicketCommand(event.aggregateId);

    await this.commandBus.execute(command);

    console.log(`Successfully processed event: ${event.eventId}`);
  }
}
