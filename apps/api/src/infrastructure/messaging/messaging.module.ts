import { Module } from '@nestjs/common';
import { RabbitMQMessagePublisher } from './rabbitmq-message-publisher';
import { TicketCreatedConsumer } from './consumers/ticket-created.consumer';
import { MESSAGE_PUBLISHER } from '@domain/events/message-publisher.interface';

@Module({
  providers: [
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
