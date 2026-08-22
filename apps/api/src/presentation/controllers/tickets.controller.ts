import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTicketCommand } from '@application/commands/tickets/create-ticket.command';
import { GetTicketQuery } from '@application/queries/tickets/get-ticket.query';
import { Ticket } from '@domain/entities/ticket.entity';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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
