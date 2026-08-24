import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Channel, ConsumeMessage } from 'amqplib';

import { RabbitMQConnection } from './rabbitmq.connection';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

export interface RetryConfig {
  retryQueue?: string;
  deadLetterQueue?: string;
  originalQueue: string;
}

@Injectable()
export class RabbitMQRetry {
  private readonly maxRetries: number;
  private readonly baseDelay: number;

  constructor(
    private readonly connection: RabbitMQConnection,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.maxRetries = parseInt(
      this.configService.get<string>('BROKER_MAX_RETRIES') ?? '3',
      10,
    );

    this.baseDelay = parseInt(
      this.configService.get<string>('BROKER_RETRY_BASE_DELAY') ?? '5000',
      10,
    );
  }

  async handleFailure(
    message: ConsumeMessage,
    error: Error,
    config: RetryConfig,
  ): Promise<void> {
    const channel = await this.connection.getChannel();

    const retryCount = this.getRetryCount(message);

    const content = message.content;

    if (!config.retryQueue) {
      this.logger.error('No retry queue configured, rejecting message', {
        context: 'RabbitMQRetry',
        queue: config.originalQueue,
      });
      channel.nack(message, false, false);
      return;
    }

    if (retryCount < this.maxRetries) {
      this.sendToRetryQueue(channel, content, retryCount, error, config);

      channel.ack(message);

      return;
    }

    if (!config.deadLetterQueue) {
      this.logger.error('Max retries reached and no DLQ configured, rejecting', {
        context: 'RabbitMQRetry',
        queue: config.originalQueue,
      });
      channel.nack(message, false, false);
      return;
    }

    this.sendToDLQ(channel, content, retryCount, error, config);

    channel.ack(message);
  }

  private sendToRetryQueue(
    channel: Channel,
    content: Buffer,
    retryCount: number,
    error: Error,
    config: RetryConfig,
  ): void {
    if (!config.retryQueue) {
      throw new Error('Retry queue not configured');
    }

    const newRetryCount = retryCount + 1;

    const delay = this.calculateBackoff(newRetryCount);

    this.logger.warn('Retrying message', {
      context: 'RabbitMQRetry',
      queue: config.originalQueue,
      retryCount: newRetryCount,
      maxRetries: this.maxRetries,
      delay,
      error: error.message,
    });

    channel.sendToQueue(config.retryQueue, content, {
      persistent: true,
      expiration: delay.toString(),
      contentType: 'application/json',

      headers: {
        'x-retry-count': newRetryCount,
        'x-last-error': error.message,
        'x-last-error-at': new Date().toISOString(),
        'x-original-queue': config.originalQueue,
      },
    });
  }

  private sendToDLQ(
    channel: Channel,
    content: Buffer,
    retryCount: number,
    error: Error,
    config: RetryConfig,
  ): void {
    if (!config.deadLetterQueue) {
      throw new Error('Dead letter queue not configured');
    }

    this.logger.error('Max retries reached, moving to DLQ', {
      context: 'RabbitMQRetry',
      queue: config.originalQueue,
      dlq: config.deadLetterQueue,
      retryCount,
      error: error.message,
    });

    channel.sendToQueue(config.deadLetterQueue, content, {
      persistent: true,
      contentType: 'application/json',

      headers: {
        'x-retry-count': retryCount,
        'x-last-error': error.message,
        'x-last-error-at': new Date().toISOString(),
        'x-original-queue': config.originalQueue,
      },
    });

    // Emit event to update ticket status to FAILED via SSE
    this.emitTicketFailed(content);
  }

  private emitTicketFailed(content: Buffer): void {
    try {
      const parsed = JSON.parse(content.toString());
      const ticketId = parsed.aggregateId ?? parsed.ticketId ?? parsed.id;

      if (ticketId && typeof ticketId === 'string') {
        this.eventEmitter.emit('ticket.dlq', {
          ticketId,
          timestamp: new Date().toISOString(),
        });

        this.eventEmitter.emit('dlq.change', {
          ticketId,
          action: 'added',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      this.logger.error('Failed to emit ticket.dlq event', {
        context: 'RabbitMQRetry',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private getRetryCount(message: ConsumeMessage): number {
    const value: unknown = message.properties.headers?.['x-retry-count'];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private calculateBackoff(retryCount: number): number {
    const multiplier = Math.pow(5, retryCount - 1);

    const delay = this.baseDelay * multiplier;

    return Math.min(delay, 5 * 60 * 1000);
  }
}
