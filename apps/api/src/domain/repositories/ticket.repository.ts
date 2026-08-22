import { Ticket } from '../entities/ticket.entity';
import { TicketStatus } from '../enums/ticket-status.enum';
import { TicketPriority } from '../enums/ticket-priority.enum';
import { TicketCategory } from '../enums/ticket-category.enum';
import { TicketSentiment } from '../enums/ticket-sentiment.enum';

export const TICKET_REPOSITORY = Symbol('TICKET_REPOSITORY');
export interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  findAll(filters?: TicketFilters): Promise<Ticket[]>;
  update(id: string, ticket: Partial<Ticket>): Promise<Ticket>;
  updateAnalysis(id: string, analysis: TicketAnalysisUpdate): Promise<void>;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  customerId?: string;
}

export interface TicketAnalysisUpdate {
  priority?: TicketPriority;
  category?: TicketCategory;
  sentiment?: TicketSentiment;
  confidence?: number;
  suggestedResponse?: string;
  status?: TicketStatus;
}
