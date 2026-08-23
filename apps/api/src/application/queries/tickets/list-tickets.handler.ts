import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ListTicketsQuery } from './list-tickets.query';
import { Ticket } from '@domain/entities/ticket.entity';
import {
  TICKET_REPOSITORY,
  type TicketRepository,
  type TicketFilters,
} from '@domain/repositories/ticket.repository';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { TicketPriority } from '@domain/enums/ticket-priority.enum';
import { TicketCategory } from '@domain/enums/ticket-category.enum';

@QueryHandler(ListTicketsQuery)
export class ListTicketsHandler implements IQueryHandler<
  ListTicketsQuery,
  Ticket[]
> {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
  ) {}

  async execute(query: ListTicketsQuery): Promise<Ticket[]> {
    const filters: TicketFilters = {};

    if (query.filters?.status) {
      filters.status = query.filters.status as TicketStatus;
    }

    if (query.filters?.priority) {
      filters.priority = query.filters.priority as TicketPriority;
    }

    if (query.filters?.category) {
      filters.category = query.filters.category as TicketCategory;
    }

    if (query.filters?.customerId) {
      filters.customerId = query.filters.customerId;
    }

    return this.ticketRepository.findAll(filters);
  }
}
