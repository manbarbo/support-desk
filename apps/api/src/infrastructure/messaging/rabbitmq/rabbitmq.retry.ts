import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Channel, ConsumeMessage } from 'amqplib';

import { RabbitMQConnection } from './rabbitmq.connection';

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

    // Si no hay retry queue configurada, hacer reject inmediatamente
    if (!config.retryQueue) {
      console.error(
        `No retry queue configured for ${config.originalQueue}. Rejecting message.`,
      );
      channel.nack(message, false, false);
      return;
    }

    if (retryCount < this.maxRetries) {
      this.sendToRetryQueue(channel, content, retryCount, error, config);

      channel.ack(message);

      return;
    }

    // Si no hay DLQ configurada, hacer reject después de los reintentos
    if (!config.deadLetterQueue) {
      console.error(
        `Max retries reached and no DLQ configured for ${config.originalQueue}. Rejecting message.`,
      );
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

    console.log(
      `Retry ${newRetryCount}/${this.maxRetries} ` + `after ${delay}ms`,
    );

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

    console.error(
      `Max retries reached. ` + `Moving message to ${config.deadLetterQueue}`,
    );

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
