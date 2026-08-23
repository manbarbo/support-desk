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
import { LOGGER } from '@infrastructure/logging/logger.interface';
import type { Logger } from '@infrastructure/logging/logger.interface';

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
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(command: AnalyzeTicketCommand): Promise<TicketAnalysis> {
    this.logger.info('Starting ticket analysis', {
      context: 'AnalyzeTicketHandler',
      ticketId: command.ticketId,
    });

    const ticket = await this.ticketRepository.findById(command.ticketId);

    if (!ticket) {
      this.logger.error('Ticket not found for analysis', {
        context: 'AnalyzeTicketHandler',
        ticketId: command.ticketId,
      });
      throw new Error(`Ticket not found: ${command.ticketId}`);
    }

    const analysis = await this.aiProvider.analyzeTicket(ticket);

    this.logger.info('AI analysis completed', {
      context: 'AnalyzeTicketHandler',
      ticketId: command.ticketId,
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
    });

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

    this.logger.info('Ticket analysis persisted', {
      context: 'AnalyzeTicketHandler',
      ticketId: command.ticketId,
      status: TicketStatus.ANALYZED,
    });

    this.ticketEventEmitter.emitTicketUpdated(
      command.ticketId,
      TicketStatus.ANALYZED,
    );

    return analysis;
  }
}
