import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AnalyzeTicketCommand } from './analyze-ticket.command';
import { TicketAnalysis } from '@domain/entities/ticket-analysis.entity';
import {
  TICKET_REPOSITORY,
  type TicketRepository,
} from '@domain/repositories/ticket.repository';
import {
  AI_PROVIDER,
  type AIProvider,
} from '@application/ports/ai-provider.interface';
import { TicketStatus } from '@domain/enums/ticket-status.enum';
import { TicketEventEmitterService } from '@application/services/ticket-event-emitter.service';

@CommandHandler(AnalyzeTicketCommand)
export class AnalyzeTicketHandler implements ICommandHandler<
  AnalyzeTicketCommand,
  TicketAnalysis
> {
  constructor(
    @Inject(TICKET_REPOSITORY)
    private readonly ticketRepository: TicketRepository,
    @Inject(AI_PROVIDER)
    private readonly aiProvider: AIProvider,
    private readonly ticketEventEmitter: TicketEventEmitterService,
  ) {}

  async execute(command: AnalyzeTicketCommand): Promise<TicketAnalysis> {
    const ticket = await this.ticketRepository.findById(command.ticketId);

    if (!ticket) {
      throw new Error(`Ticket not found: ${command.ticketId}`);
    }

    const analysis = await this.aiProvider.analyzeTicket(ticket);

    await this.ticketRepository.updateAnalysis(command.ticketId, {
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      suggestedResponse: analysis.suggestedResponse,
    });

    await this.ticketRepository.update(command.ticketId, {
      status: TicketStatus.ANALYZED,
    });

    // Emitir evento de actualización para SSE
    this.ticketEventEmitter.emitTicketUpdated(
      command.ticketId,
      TicketStatus.ANALYZED,
    );

    return analysis;
  }
}
