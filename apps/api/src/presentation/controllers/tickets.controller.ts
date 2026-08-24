import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTicketCommand } from '@application/commands/tickets/create-ticket/create-ticket.command';
import { GetTicketQuery } from '@application/queries/tickets/get-ticket.query';
import { ListTicketsQuery } from '@application/queries/tickets/list-tickets.query';
import { Ticket } from '@domain/entities/ticket.entity';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async listTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('customerId') customerId?: string,
  ) {
    const query = new ListTicketsQuery({
      status,
      priority,
      category,
      customerId,
    });

    return this.queryBus.execute<ListTicketsQuery, Ticket[]>(query);
  }

  @Post()
  async createTicket(
    @Body() body: { customerId: string; title: string; description: string },
  ) {
    const command = new CreateTicketCommand(
      body.customerId,
      body.title,
      body.description,
    );

    return this.commandBus.execute<CreateTicketCommand, Ticket>(command);
  }

  @Get(':id')
  async getTicket(@Param('id') id: string) {
    const query = new GetTicketQuery(id);
    const ticket = await this.queryBus.execute<GetTicketQuery, Ticket | null>(
      query,
    );

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    return ticket;
  }
}
