import { Ticket } from '@domain/entities/ticket.entity';
import { TicketAnalysis } from '@domain/entities/ticket-analysis.entity';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AIProvider {
  analyzeTicket(ticket: Ticket): Promise<TicketAnalysis>;
}
