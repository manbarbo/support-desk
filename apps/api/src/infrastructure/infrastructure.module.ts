import { Module } from '@nestjs/common';

import { MessagingModule } from './messaging/messaging.module';

import { SupabaseService } from './database/supabase.service';
import { SupabaseTicketRepository } from './repositories/supabase-ticket.repository';
import { OpenCodeAdapter } from './ai/opencode/opencode.adapter';

import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';
import { AI_PROVIDER } from '@application/ports/ai-provider.interface';

@Module({
  imports: [MessagingModule],
  providers: [
    SupabaseService,
    {
      provide: TICKET_REPOSITORY,
      useClass: SupabaseTicketRepository,
    },
    {
      provide: AI_PROVIDER,
      useClass: OpenCodeAdapter,
    },
  ],
  exports: [TICKET_REPOSITORY, AI_PROVIDER, MessagingModule],
})
export class InfrastructureModule {}
