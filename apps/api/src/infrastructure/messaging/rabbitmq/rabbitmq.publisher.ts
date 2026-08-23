import { Injectable, Inject } from '@nestjs/common';

import type { MessagePublisher } from '@domain/events/message-publisher.interface';
import type { DomainEvent } from '@domain/events/domain-event';

import { RabbitMQConnection } from './rabbitmq.connection';
import { RABBITMQ_EXCHANGE } from './rabbitmq.constants';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

@Injectable()
export class RabbitMQMessagePublisher implements MessagePublisher {
  constructor(
    private readonly connection: RabbitMQConnection,
    @Inject(RABBITMQ_EXCHANGE) private readonly exchange: string,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const channel = await this.connection.getChannel();

    const message = Buffer.from(JSON.stringify(event));

    const published = channel.publish(this.exchange, event.eventType, message, {
      persistent: true,
      contentType: 'application/json',
    });

    if (!published) {
      this.logger.warn('RabbitMQ buffer is full', {
        context: 'RabbitMQMessagePublisher',
        eventId: event.eventId,
        eventType: event.eventType,
      });
    }

    this.logger.info('Event published', {
      context: 'RabbitMQMessagePublisher',
      eventType: event.eventType,
      eventId: event.eventId,
      exchange: this.exchange,
    });
  }
}
