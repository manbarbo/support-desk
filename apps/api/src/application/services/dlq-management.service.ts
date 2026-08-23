import { Inject, Injectable } from '@nestjs/common';
import {
  RabbitMQDLQService,
  type DLQMessage,
  type DLQListResult,
} from '@infrastructure/messaging/rabbitmq/rabbitmq-dlq.service';
import { TICKET_CREATED_QUEUE } from '@infrastructure/messaging/messaging.config';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

@Injectable()
export class DLQManagementService {
  private readonly defaultDLQ: string;
  private readonly defaultTargetQueue: string;

  constructor(
    private readonly dlqService: RabbitMQDLQService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    const { deadLetterQueue, queue } = TICKET_CREATED_QUEUE;

    if (!deadLetterQueue) {
      throw new Error('DLQ is not configured for ticket.created');
    }

    this.defaultDLQ = deadLetterQueue;
    this.defaultTargetQueue = queue;
  }

  async listMessages(limit?: number): Promise<DLQListResult> {
    this.logger.info('Listing DLQ messages', {
      context: 'DLQManagementService',
      queue: this.defaultDLQ,
      limit,
    });

    return this.dlqService.listMessages(this.defaultDLQ, limit);
  }

  async getMessage(messageId: string): Promise<DLQMessage | null> {
    this.logger.info('Getting DLQ message', {
      context: 'DLQManagementService',
      queue: this.defaultDLQ,
      messageId,
    });

    const result = await this.listMessages(100);

    return result.messages.find((message) => message.id === messageId) ?? null;
  }

  async reprocessMessage(messageId: string): Promise<boolean> {
    this.logger.info('Reprocessing DLQ message', {
      context: 'DLQManagementService',
      queue: this.defaultDLQ,
      targetQueue: this.defaultTargetQueue,
      messageId,
    });

    return this.dlqService.reprocessMessage(
      this.defaultDLQ,
      messageId,
      this.defaultTargetQueue,
    );
  }

  async reprocessAll(limit?: number): Promise<{ reprocessed: number }> {
    this.logger.info('Reprocessing all DLQ messages', {
      context: 'DLQManagementService',
      queue: this.defaultDLQ,
      targetQueue: this.defaultTargetQueue,
      limit,
    });

    return this.dlqService.reprocessAll(
      this.defaultDLQ,
      this.defaultTargetQueue,
      limit,
    );
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    this.logger.info('Deleting DLQ message', {
      context: 'DLQManagementService',
      queue: this.defaultDLQ,
      messageId,
    });

    return this.dlqService.deleteMessage(this.defaultDLQ, messageId);
  }
}
