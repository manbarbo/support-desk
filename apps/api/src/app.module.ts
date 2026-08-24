import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GlobalCqrsModule } from './common/global-cqrs.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { LoggerModule } from './infrastructure/logging/logger.module';

import { TicketsController } from '@presentation/controllers/tickets.controller';
import { TicketEventsController } from '@presentation/controllers/ticket-events.controller';
import { DlqEventsController } from '@presentation/controllers/dlq-events.controller';
import { DLQController } from '@presentation/controllers/admin/dlq.controller';
import { LoggingInterceptor } from './presentation/interceptors/logging.interceptor';

import { COMMAND_HANDLERS } from '@application/commands';
import { QUERY_HANDLERS } from '@application/queries';
import { TicketEventEmitterService } from '@application/services/ticket-event-emitter.service';
import { DLQManagementService } from '@application/services/dlq-management.service';
import { TicketDlqHandler } from '@application/handlers/ticket-dlq.handler';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '../../.env',
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    GlobalCqrsModule,
    InfrastructureModule,
    LoggerModule,
  ],
  controllers: [
    TicketsController,
    TicketEventsController,
    DlqEventsController,
    DLQController,
  ],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    TicketEventEmitterService,
    DLQManagementService,
    TicketDlqHandler,
    LoggingInterceptor,
  ],
})
export class AppModule {}
