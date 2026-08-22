import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetTicketQuery } from './get-ticket.query';
import { Ticket } from '@domain/entities/ticket.entity';
import {
  TICKET_REPOSITORY,
  type TicketRepository,
} from '@domain/repositories/ticket.repository';

@QueryHandler(GetTicketQuery)
export class GetTicketHandler implements IQueryHandler<
  GetTicketQuery,
  Ticket | null
> {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
  ) {}

  async execute(query: GetTicketQuery): Promise<Ticket | null> {
    return this.ticketRepository.findById(query.id);
  }
}
