import { Module } from '@nestjs/common';
import { SupabaseService } from './database/supabase.service';
import { SupabaseTicketRepository } from './repositories/supabase-ticket.repository';
import { RabbitMQMessagePublisher } from './messaging/rabbitmq-message-publisher';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { MESSAGE_PUBLISHER } from '@domain/events/message-publisher.interface';

@Module({
  providers: [
    SupabaseService,
    {
      provide: TICKET_REPOSITORY,
      useClass: SupabaseTicketRepository,
    },
    {
      provide: MESSAGE_PUBLISHER,
      useClass: RabbitMQMessagePublisher,
    },
  ],
  exports: [TICKET_REPOSITORY, MESSAGE_PUBLISHER],
})
export class InfrastructureModule {}
