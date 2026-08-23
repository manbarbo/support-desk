import { Inject, Injectable } from '@nestjs/common';
import type { GetMessage } from 'amqplib';

import { RabbitMQConnection } from './rabbitmq.connection';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

export interface DLQMessage {
  id: string;
  content: unknown;
  headers: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  lastError: string;
  lastErrorAt: string;
  originalQueue: string;
}

export interface DLQListResult {
  messages: DLQMessage[];
  total: number;
}

@Injectable()
export class RabbitMQDLQService {
  constructor(
    private readonly connection: RabbitMQConnection,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async listMessages(queueName: string, limit = 50): Promise<DLQListResult> {
    const channel = await this.connection.getChannel();

    const messages: DLQMessage[] = [];

    for (let i = 0; i < limit; i++) {
      const message = await channel.get(queueName, {
        noAck: false,
      });

      if (!message) {
        break;
      }

      try {
        messages.push(this.parseMessage(message));
      } catch (error) {
        this.logger.error('Failed to parse DLQ message', {
          context: 'RabbitMQDLQService',
          queue: queueName,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        // Reinsert message into the DLQ.
        channel.nack(message, false, true);
      }
    }

    this.logger.info('Listed DLQ messages', {
      context: 'RabbitMQDLQService',
      queue: queueName,
      count: messages.length,
    });

    return {
      messages,
      total: messages.length,
    };
  }

  async reprocessMessage(
    queueName: string,
    messageId: string,
    targetQueue: string,
  ): Promise<boolean> {
    const channel = await this.connection.getChannel();

    const message = await channel.get(queueName, {
      noAck: false,
    });

    if (!message) {
      return false;
    }

    const parsed = this.parseMessage(message);

    if (parsed.id !== messageId) {
      channel.nack(message, false, true);

      this.logger.warn('Message ID mismatch', {
        context: 'RabbitMQDLQService',
        expected: messageId,
        found: parsed.id,
      });

      return false;
    }

    channel.sendToQueue(targetQueue, message.content, {
      persistent: true,
      contentType: 'application/json',
      headers: {
        ...message.properties.headers,
        'x-reprocessed': true,
        'x-reprocessed-at': new Date().toISOString(),
        'x-original-dlq': queueName,
      },
    });

    channel.ack(message);

    this.logger.info('Message reprocessed', {
      context: 'RabbitMQDLQService',
      queue: queueName,
      targetQueue,
      messageId,
    });

    return true;
  }

  async reprocessAll(
    queueName: string,
    targetQueue: string,
    limit = 100,
  ): Promise<{ reprocessed: number }> {
    let reprocessed = 0;

    for (let i = 0; i < limit; i++) {
      const success = await this.reprocessFirst(queueName, targetQueue);

      if (!success) {
        break;
      }

      reprocessed++;
    }

    this.logger.info('DLQ batch reprocessing completed', {
      context: 'RabbitMQDLQService',
      queue: queueName,
      targetQueue,
      reprocessed,
      limit,
    });

    return { reprocessed };
  }

  async deleteMessage(queueName: string, messageId: string): Promise<boolean> {
    const channel = await this.connection.getChannel();

    const message = await channel.get(queueName, {
      noAck: false,
    });

    if (!message) {
      return false;
    }

    const parsed = this.parseMessage(message);

    if (parsed.id !== messageId) {
      channel.nack(message, false, true);
      return false;
    }

    channel.ack(message);

    this.logger.info('Message deleted from DLQ', {
      context: 'RabbitMQDLQService',
      queue: queueName,
      messageId,
    });

    return true;
  }

  private async reprocessFirst(
    queueName: string,
    targetQueue: string,
  ): Promise<boolean> {
    const channel = await this.connection.getChannel();

    const message = await channel.get(queueName, {
      noAck: false,
    });

    if (!message) {
      return false;
    }

    channel.sendToQueue(targetQueue, message.content, {
      persistent: true,
      contentType: 'application/json',
      headers: {
        ...message.properties.headers,
        'x-reprocessed': true,
        'x-reprocessed-at': new Date().toISOString(),
        'x-original-dlq': queueName,
      },
    });

    channel.ack(message);

    return true;
  }

  private parseMessage(message: GetMessage): DLQMessage {
    const rawContent = message.content.toString();

    let content: unknown;

    try {
      content = JSON.parse(rawContent);
    } catch {
      content = rawContent;
    }

    const headers = this.getHeaders(message);
    const messageId = this.getMessageId(message);

    const id = messageId ?? rawContent.slice(0, 8);

    const timestamp =
      typeof message.properties.timestamp === 'number'
        ? new Date(message.properties.timestamp).toISOString()
        : new Date().toISOString();

    return {
      id,
      content,
      headers,
      timestamp,
      retryCount: this.getHeaderNumber(headers, 'x-retry-count'),
      lastError: this.getHeaderString(headers, 'x-last-error'),
      lastErrorAt: this.getHeaderString(headers, 'x-last-error-at'),
      originalQueue: this.getHeaderString(headers, 'x-original-queue'),
    };
  }

  private getMessageId(message: GetMessage): string | undefined {
    const messageId: unknown = message.properties.messageId;

    return typeof messageId === 'string' ? messageId : undefined;
  }

  private getHeaders(message: GetMessage): Record<string, unknown> {
    const headers: unknown = message.properties.headers;

    return this.isRecord(headers) ? headers : {};
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getHeaderNumber(
    headers: Record<string, unknown>,
    key: string,
  ): number {
    const value = headers[key];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private getHeaderString(
    headers: Record<string, unknown>,
    key: string,
  ): string {
    const value = headers[key];

    if (typeof value === 'string') {
      return value;
    }

    if (Buffer.isBuffer(value)) {
      return value.toString();
    }

    return '';
  }
}
