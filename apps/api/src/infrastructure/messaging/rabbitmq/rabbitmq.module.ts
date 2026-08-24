import { DynamicModule, Module } from '@nestjs/common';

import { RabbitMQConnection } from './rabbitmq.connection';
import { RabbitMQConsumer } from './rabbitmq.consumer';
import { RabbitMQDLQService } from './rabbitmq-dlq.service';
import { RabbitMQMessagePublisher } from './rabbitmq.publisher';
import { RabbitMQRetry } from './rabbitmq.retry';
import { RabbitMQTopology } from './rabbitmq.topology';

import { RABBITMQ_EXCHANGE } from './rabbitmq.constants';

@Module({})
export class RabbitMQModule {
  static forRoot(exchange: string): DynamicModule {
    return {
      module: RabbitMQModule,

      providers: [
        RabbitMQConnection,
        RabbitMQConsumer,
        RabbitMQDLQService,
        RabbitMQMessagePublisher,
        RabbitMQRetry,
        RabbitMQTopology,
        {
          provide: RABBITMQ_EXCHANGE,
          useValue: exchange,
        },
      ],

      exports: [
        RabbitMQConsumer,
        RabbitMQDLQService,
        RabbitMQMessagePublisher,
      ],
    };
  }
}
