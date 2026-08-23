import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

import { ConfigService } from '@nestjs/config';

import { createWinstonConfig } from './winston.config';

import type { Logger } from '../logger.interface';
import { formatLog } from '../logger.formatter';

@Injectable()
export class WinstonLoggerService implements LoggerService, Logger {
  private readonly logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    this.logger = winston.createLogger(createWinstonConfig(isProduction));
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    const formatted = formatLog(message, metadata);

    this.logger.debug(formatted.message, formatted.metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    const formatted = formatLog(message, metadata);

    this.logger.info(formatted.message, formatted.metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    const formatted = formatLog(message, metadata);

    this.logger.warn(formatted.message, formatted.metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    const formatted = formatLog(message, metadata);

    this.logger.error(formatted.message, formatted.metadata);
  }

  log(message: string): void {
    this.info(message);
  }
}
