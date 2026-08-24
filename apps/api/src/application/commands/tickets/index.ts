import { CreateTicketHandler } from './create-ticket/create-ticket.handler';
import { AnalyzeTicketHandler } from './analize-ticket/analyze-ticket.handler';

export const TICKET_COMMAND_HANDLERS = [
  CreateTicketHandler,
  AnalyzeTicketHandler,
];
