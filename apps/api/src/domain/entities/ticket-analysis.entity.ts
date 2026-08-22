import { TicketCategory } from '../enums/ticket-category.enum';
import { TicketPriority } from '../enums/ticket-priority.enum';
import { TicketSentiment } from '../enums/ticket-sentiment.enum';

export interface TicketAnalysis {
  id: string;
  ticketId: string;
  category: TicketCategory;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  confidence: number;
  suggestedResponse: string;
  createdAt: Date;
}
