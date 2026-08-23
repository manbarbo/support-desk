import { Module } from '@nestjs/common';

import { RabbitMQMessagePublisher } from './rabbitmq/rabbitmq.publisher';
import { RabbitMQConsumer } from './rabbitmq/rabbitmq.consumer';
import { RabbitMQConnection } from './rabbitmq/rabbitmq.connection';
import { RabbitMQRetry } from './rabbitmq/rabbitmq.retry';
import { RabbitMQTopology } from './rabbitmq/rabbitmq.topology';

import { TicketCreatedConsumer } from './consumers/ticket-created.consumer';

import { MESSAGE_PUBLISHER } from '@domain/events/message-publisher.interface';

@Module({
  providers: [
    RabbitMQConnection,
    RabbitMQTopology,
    RabbitMQRetry,
    RabbitMQConsumer,
    RabbitMQMessagePublisher,
    TicketCreatedConsumer,

    {
      provide: MESSAGE_PUBLISHER,
      useExisting: RabbitMQMessagePublisher,
    },
  ],

  exports: [MESSAGE_PUBLISHER],
})
export class MessagingModule {}
