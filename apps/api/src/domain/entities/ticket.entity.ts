import { TicketStatus } from '../enums/ticket-status.enum';
import { TicketPriority } from '../enums/ticket-priority.enum';
import { TicketCategory } from '../enums/ticket-category.enum';
import { TicketSentiment } from '../enums/ticket-sentiment.enum';

export interface Ticket {
  id: string;
  customerId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  sentiment?: TicketSentiment;
  confidence?: number;
  suggestedResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}
