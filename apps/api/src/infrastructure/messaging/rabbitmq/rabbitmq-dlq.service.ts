import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

interface ManagementMessage {
  payload_bytes: number;
  redelivered: boolean;
  exchange: string;
  routing_key: string;
  message_count: number;
  properties: {
    delivery_mode: number;
    headers: Record<string, unknown>;
    content_type: string;
    message_id?: string;
    timestamp?: number;
  };
  payload: string;
  payload_encoding: string;
}

@Injectable()
export class RabbitMQDLQService {
  private readonly managementUrl: string;
  private readonly credentials: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    const brokerUrl =
      this.configService.get<string>('BROKER_URL') ??
      'amqp://guest:guest@localhost:5672';
    const url = new URL(brokerUrl.replace('amqp://', 'http://'));

    const username = this.configService.get<string>('RABBITMQ_USER') ?? 'guest';
    const password = this.configService.get<string>('RABBITMQ_PASS') ?? 'guest';

    this.managementUrl = `http://${url.hostname}:15672`;
    this.credentials = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
  }

  async listMessages(queueName: string, limit = 50): Promise<DLQListResult> {
    const rawMessages = await this.getFromQueue(
      queueName,
      limit,
      'ack_requeue_true',
    );

    const messages = rawMessages.map((msg) => this.parseMessage(msg));

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

  async getMessage(
    queueName: string,
    messageId: string,
  ): Promise<DLQMessage | null> {
    const rawMessages = await this.getFromQueue(
      queueName,
      100,
      'ack_requeue_true',
    );
    const messages = rawMessages.map((msg) => this.parseMessage(msg));

    return messages.find((m) => m.id === messageId) ?? null;
  }

  async reprocessMessage(
    queueName: string,
    messageId: string,
    targetQueue: string,
  ): Promise<boolean> {
    // Step 1: Peek at messages (requeue) to find the target
    const peekMessages = await this.getFromQueue(
      queueName,
      100,
      'ack_requeue_true',
    );

    const targetMessage = peekMessages.find((msg) => {
      const parsed = this.parseMessage(msg);
      return parsed.id === messageId;
    });

    if (!targetMessage) {
      this.logger.warn('Message not found for reprocessing', {
        context: 'RabbitMQDLQService',
        queue: queueName,
        messageId,
      });
      return false;
    }

    // Step 2: Consume all messages to get the raw target
    const consumedMessages = await this.getFromQueue(
      queueName,
      100,
      'ack_requeue_false',
    );

    const rawMessage = consumedMessages.find((msg) => {
      const parsed = this.parseMessage(msg);
      return parsed.id === messageId;
    });

    if (!rawMessage) {
      this.logger.warn('Raw message not found for reprocessing', {
        context: 'RabbitMQDLQService',
        queue: queueName,
        messageId,
      });
      return false;
    }

    // Step 3: Publish target to the main queue
    await this.publishRaw(targetQueue, rawMessage);

    // Step 4: Requeue all other messages that were consumed
    for (const msg of consumedMessages) {
      const parsed = this.parseMessage(msg);
      if (parsed.id !== messageId) {
        await this.publishRaw(queueName, msg);
      }
    }

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
    const rawMessages = await this.getFromQueue(
      queueName,
      limit,
      'ack_requeue_false',
    );
    let reprocessed = 0;

    for (const msg of rawMessages) {
      try {
        await this.publishRaw(targetQueue, msg);
        reprocessed++;
      } catch (error) {
        this.logger.error('Failed to reprocess message', {
          context: 'RabbitMQDLQService',
          error: error instanceof Error ? error.message : String(error),
        });
      }
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
    // Step 1: Peek at messages (requeue) to verify the message exists
    const peekMessages = await this.getFromQueue(
      queueName,
      100,
      'ack_requeue_true',
    );

    const found = peekMessages.some((msg) => {
      const parsed = this.parseMessage(msg);
      return parsed.id === messageId;
    });

    if (!found) {
      this.logger.warn('Message not found for deletion', {
        context: 'RabbitMQDLQService',
        queue: queueName,
        messageId,
      });
      return false;
    }

    // Step 2: Consume all messages to find and delete the target
    const consumedMessages = await this.getFromQueue(
      queueName,
      100,
      'ack_requeue_false',
    );

    // Requeue messages that are NOT the target
    for (const msg of consumedMessages) {
      const parsed = this.parseMessage(msg);
      if (parsed.id !== messageId) {
        await this.publishRaw(queueName, msg);
      }
    }

    this.logger.info('Message deleted from DLQ', {
      context: 'RabbitMQDLQService',
      queue: queueName,
      messageId,
    });

    return true;
  }

  private async getFromQueue(
    queueName: string,
    count: number,
    ackMode: 'ack_requeue_true' | 'ack_requeue_false',
  ): Promise<ManagementMessage[]> {
    const encodedQueue = encodeURIComponent(queueName);
    const url = `${this.managementUrl}/api/queues/%2F/${encodedQueue}/get`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.credentials}`,
      },
      body: JSON.stringify({
        count,
        ackmode: ackMode,
        encoding: 'auto',
      }),
    });

    if (!response.ok) {
      throw new Error(`RabbitMQ Management API error: ${response.status}`);
    }

    return response.json() as Promise<ManagementMessage[]>;
  }

  private async publishRaw(
    queueName: string,
    message: ManagementMessage,
  ): Promise<void> {
    const url = `${this.managementUrl}/api/exchanges/%2F/amq.default/publish`;

    const headers: Record<string, unknown> = message.properties?.headers ?? {};

    const payload =
      message.payload_encoding === 'base64'
        ? Buffer.from(message.payload, 'base64').toString()
        : message.payload;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.credentials}`,
      },
      body: JSON.stringify({
        properties: {
          delivery_mode: message.properties?.delivery_mode ?? 2,
          headers: {
            ...headers,
            'x-reprocessed': true,
            'x-reprocessed-at': new Date().toISOString(),
            'x-original-dlq': queueName,
          },
        },
        routing_key: queueName,
        payload,
        payload_encoding: 'string',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to publish message: ${response.status}`);
    }
  }

  private parseMessage(msg: ManagementMessage): DLQMessage {
    let content: unknown;

    try {
      const raw =
        msg.payload_encoding === 'base64'
          ? Buffer.from(msg.payload, 'base64').toString()
          : msg.payload;

      content = JSON.parse(raw);
    } catch {
      content = msg.payload;
    }

    const headers: Record<string, unknown> = msg.properties?.headers ?? {};

    const id = this.extractMessageId(content, msg.properties?.message_id);

    const timestamp =
      typeof msg.properties?.timestamp === 'number'
        ? new Date(msg.properties.timestamp).toISOString()
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

  private getHeaderNumber(
    headers: Record<string, unknown>,
    key: string,
  ): number {
    const value = headers[key];
    if (typeof value === 'number') return value;
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
    if (typeof value === 'string') return value;
    if (Buffer.isBuffer(value)) return value.toString();
    return '';
  }

  private extractMessageId(content: unknown, messageId?: string): string {
    if (messageId) {
      return messageId;
    }

    if (typeof content === 'object' && content !== null) {
      const obj = content as Record<string, unknown>;

      const candidates = [obj.aggregateId, obj.eventId, obj.ticketId];

      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.length > 0) {
          return candidate;
        }
      }
    }

    const serialized =
      typeof content === 'string' ? content : JSON.stringify(content);

    return serialized.slice(0, 8);
  }
}
