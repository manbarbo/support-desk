export type TicketStatus =
  "OPEN" | "PROCESSING" | "ANALYZED" | "FAILED" | "RESOLVED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketCategory =
  "ORDER" | "BILLING" | "TECHNICAL" | "ACCOUNT" | "GENERAL";

export type TicketSentiment =
  "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "FRUSTRATED" | "ANGRY";

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDTO {
  customerId: string;
  title: string;
  description: string;
}
