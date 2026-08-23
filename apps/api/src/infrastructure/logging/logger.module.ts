import { Global, Module } from '@nestjs/common';
import { WinstonLoggerService } from './winston/winstonLogger.service';
import { LOGGER } from './logger.interface';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      useClass: WinstonLoggerService,
    },
    WinstonLoggerService,
  ],
  exports: [LOGGER, WinstonLoggerService],
})
export class LoggerModule {}
