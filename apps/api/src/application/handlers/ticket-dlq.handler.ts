import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TICKET_REPOSITORY,
  type TicketRepository,
} from '@domain/repositories/ticket.repository';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { TicketEventEmitterService } from '@application/services/ticket-event-emitter.service';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

export interface TicketDlqEvent {
  ticketId: string;
  timestamp: string;
}

@Injectable()
export class TicketDlqHandler {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    private readonly ticketEventEmitter: TicketEventEmitterService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @OnEvent('ticket.dlq')
  async handleTicketDlq(event: TicketDlqEvent): Promise<void> {
    this.logger.info('Ticket moved to DLQ, updating status to FAILED', {
      context: 'TicketDlqHandler',
      ticketId: event.ticketId,
    });

    try {
      await this.ticketRepository.update(event.ticketId, {
        status: TicketStatus.FAILED,
      });

      this.logger.info('Ticket status updated to FAILED', {
        context: 'TicketDlqHandler',
        ticketId: event.ticketId,
      });

      // Emit SSE event so the frontend updates
      this.ticketEventEmitter.emitTicketUpdated(
        event.ticketId,
        TicketStatus.FAILED,
      );
    } catch (error) {
      this.logger.error('Failed to update ticket status to FAILED', {
        context: 'TicketDlqHandler',
        ticketId: event.ticketId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
