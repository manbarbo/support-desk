import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { TicketsController } from '@presentation/controllers/tickets.controller';
import { CreateTicketHandler } from '@application/commands/tickets/create-ticket.handler';
import { GetTicketHandler } from '@application/queries/tickets/get-ticket.handler';

const CommandHandlers = [CreateTicketHandler];
const QueryHandlers = [GetTicketHandler];
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '../../.env',
      isGlobal: true,
    }),
    CqrsModule,
    InfrastructureModule,
  ],
  controllers: [TicketsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class AppModule {}
