import { Module } from '@nestjs/common';

import { AIModule } from './ai/ai.module';
import { MessagingModule } from './messaging/messaging.module';

import { SupabaseService } from './database/supabase.service';
import { SupabaseTicketRepository } from './repositories/supabase-ticket.repository';

import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';

@Module({
  imports: [MessagingModule, AIModule],
  providers: [
    SupabaseService,
    {
      provide: TICKET_REPOSITORY,
      useClass: SupabaseTicketRepository,
    },
  ],
  exports: [TICKET_REPOSITORY, AIModule, MessagingModule],
})
export class InfrastructureModule {}
