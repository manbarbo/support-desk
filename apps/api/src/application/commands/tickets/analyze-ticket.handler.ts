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
  ) {}

  async execute(command: AnalyzeTicketCommand): Promise<TicketAnalysis> {
    // 1. Buscar el ticket por ID
    const ticket = await this.ticketRepository.findById(command.ticketId);

    // 2. Validar que el ticket existe
    if (!ticket) {
      throw new Error(`Ticket not found: ${command.ticketId}`);
    }

    // 3. Llamar al AI Provider para analizar el ticket
    const analysis = await this.aiProvider.analyzeTicket(ticket);

    // 4. Guardar el análisis en el repositorio
    await this.ticketRepository.updateAnalysis(command.ticketId, {
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      suggestedResponse: analysis.suggestedResponse,
    });

    // 5. Actualizar el estado del ticket a ANALYZED
    await this.ticketRepository.update(command.ticketId, {
      status: TicketStatus.ANALYZED,
    });

    // 6. Retornar el análisis
    return analysis;
  }
}
