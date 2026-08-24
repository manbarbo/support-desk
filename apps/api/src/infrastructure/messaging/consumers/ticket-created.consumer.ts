import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { ConsumeMessage } from 'amqplib';

import { AnalyzeTicketCommand } from '@application/commands/tickets/analize-ticket/analyze-ticket.command';
import { RabbitMQConsumer } from '../rabbitmq/rabbitmq.consumer';
import type { DomainEvent } from '@domain/events/domain-event';
import {
  SUPPORT_EVENTS_EXCHANGE,
  TICKET_CREATED_QUEUE,
} from '../messaging.config';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

@Injectable()
export class TicketCreatedConsumer implements OnModuleInit {
  constructor(
    private readonly consumer: RabbitMQConsumer,
    private readonly commandBus: CommandBus,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.consume(
      TICKET_CREATED_QUEUE,
      SUPPORT_EVENTS_EXCHANGE,
      async (message: ConsumeMessage) => {
        await this.processMessage(message);
      },
    );
  }

  private async processMessage(message: ConsumeMessage): Promise<void> {
    const content = message.content.toString();

    const event = JSON.parse(content) as DomainEvent;

    this.logger.info('Received event', {
      context: 'TicketCreatedConsumer',
      eventType: event.eventType,
      eventId: event.eventId,
      ticketId: event.aggregateId,
    });

    const command = new AnalyzeTicketCommand(event.aggregateId);

    await this.commandBus.execute(command);

    this.logger.info('Successfully processed event', {
      context: 'TicketCreatedConsumer',
      eventId: event.eventId,
      ticketId: event.aggregateId,
    });
  }
}
