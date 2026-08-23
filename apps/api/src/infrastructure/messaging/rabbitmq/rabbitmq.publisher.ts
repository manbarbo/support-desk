import { Injectable } from '@nestjs/common';

import type { MessagePublisher } from '@domain/events/message-publisher.interface';
import type { DomainEvent } from '@domain/events/domain-event';

import { RabbitMQConnection } from './rabbitmq.connection';

@Injectable()
export class RabbitMQMessagePublisher implements MessagePublisher {
  private readonly exchange = 'support.events';

  constructor(private readonly connection: RabbitMQConnection) {}

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
