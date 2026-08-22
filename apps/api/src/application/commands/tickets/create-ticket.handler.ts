import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateTicketCommand } from './create-ticket.command';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { Ticket } from '@domain/entities/ticket.entity';
import {
  TICKET_REPOSITORY,
  type TicketRepository,
} from '@domain/repositories/ticket.repository';
import {
  MESSAGE_PUBLISHER,
  type MessagePublisher,
} from '@domain/events/message-publisher.interface';
import { TicketCreatedEvent } from '@domain/events/ticket-created.event';

@CommandHandler(CreateTicketCommand)
export class CreateTicketHandler implements ICommandHandler<
  CreateTicketCommand,
  Ticket
> {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: MessagePublisher,
  ) {}

  async execute(command: CreateTicketCommand): Promise<Ticket> {
    const now = new Date();

    const ticket: Ticket = {
      id: crypto.randomUUID(),
      customerId: command.customerId,
      title: command.title,
      description: command.description,
      status: TicketStatus.PROCESSING,
      createdAt: now,
      updatedAt: now,
    };

    const createdTicket = await this.ticketRepository.create(ticket);
    const event = new TicketCreatedEvent(createdTicket);
    this.messagePublisher.publish(event);

    return createdTicket;
  }
}
