import { Module } from '@nestjs/common';
import { SupabaseService } from './database/supabase.service';
import { SupabaseTicketRepository } from './repositories/supabase-ticket.repository';
import { TICKET_REPOSITORY } from '@domain/repositories/ticket.repository';

@Module({
  providers: [
    SupabaseService,
    {
      provide: TICKET_REPOSITORY,
      useClass: SupabaseTicketRepository,
    },
  ],
  exports: [TICKET_REPOSITORY],
})
export class InfrastructureModule {}
