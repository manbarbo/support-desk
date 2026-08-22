import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GlobalCqrsModule } from './common/global-cqrs.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

import { TicketsController } from '@presentation/controllers/tickets.controller';

import { CreateTicketHandler } from '@application/commands/tickets/create-ticket.handler';
import { AnalyzeTicketHandler } from '@application/commands/tickets/analyze-ticket.handler';
import { GetTicketHandler } from '@application/queries/tickets/get-ticket.handler';

const CommandHandlers = [CreateTicketHandler, AnalyzeTicketHandler];
const QueryHandlers = [GetTicketHandler];
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '../../.env',
      isGlobal: true,
    }),
    GlobalCqrsModule,
    InfrastructureModule,
  ],
  controllers: [TicketsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class AppModule {}
