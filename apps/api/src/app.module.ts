import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GlobalCqrsModule } from './common/global-cqrs.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

import { TicketsController } from '@presentation/controllers/tickets.controller';

import { COMMAND_HANDLERS } from '@application/commands';
import { QUERY_HANDLERS } from '@application/queries';

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
  providers: [...COMMAND_HANDLERS, ...QUERY_HANDLERS],
})
export class AppModule {}
