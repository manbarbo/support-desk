import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetTicketQuery } from './get-ticket.query';
import { Ticket } from '@domain/entities/ticket.entity';
import {
  TICKET_REPOSITORY,
  type TicketRepository,
} from '@domain/repositories/ticket.repository';
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

@QueryHandler(GetTicketQuery)
export class GetTicketHandler implements IQueryHandler<
  GetTicketQuery,
  Ticket | null
> {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(query: GetTicketQuery): Promise<Ticket | null> {
    this.logger.debug('Fetching ticket', {
      context: 'GetTicketHandler',
      ticketId: query.id,
    });

    const ticket = await this.ticketRepository.findById(query.id);

    if (ticket) {
      this.logger.debug('Ticket found', {
        context: 'GetTicketHandler',
        ticketId: query.id,
        status: ticket.status,
      });
    } else {
      this.logger.warn('Ticket not found', {
        context: 'GetTicketHandler',
        ticketId: query.id,
      });
    }

    return ticket;
  }
}
