import { Injectable, Inject } from '@nestjs/common';

import type { MessagePublisher } from '@domain/events/message-publisher.interface';
import type { DomainEvent } from '@domain/events/domain-event';

import { RabbitMQConnection } from './rabbitmq.connection';
import { RABBITMQ_EXCHANGE } from './rabbitmq.constants';

@Injectable()
export class RabbitMQMessagePublisher implements MessagePublisher {
  constructor(
    private readonly connection: RabbitMQConnection,
    @Inject(RABBITMQ_EXCHANGE) private readonly exchange: string,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const channel = await this.connection.getChannel();

    const message = Buffer.from(JSON.stringify(event));

    const published = channel.publish(this.exchange, event.eventType, message, {
      persistent: true,
      contentType: 'application/json',
    });

    if (!published) {
      console.warn(`RabbitMQ buffer is full for event ${event.eventId}`);
    }

    console.log(`Published event: ${event.eventType} (${event.eventId})`);
  }
}
