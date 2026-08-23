import { Module } from '@nestjs/common';

import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { RabbitMQMessagePublisher } from './rabbitmq/rabbitmq.publisher';

import { TicketCreatedConsumer } from './consumers/ticket-created.consumer';

import { MESSAGE_PUBLISHER } from '@domain/events/message-publisher.interface';

import { SUPPORT_EVENTS_EXCHANGE } from './messaging.config';

@Module({
  imports: [RabbitMQModule.forRoot(SUPPORT_EVENTS_EXCHANGE.name)],

  providers: [
    TicketCreatedConsumer,

    {
      provide: MESSAGE_PUBLISHER,
      useExisting: RabbitMQMessagePublisher,
    },
  ],

  exports: [MESSAGE_PUBLISHER, RabbitMQModule],
})
export class MessagingModule {}
