import { CreateTicketHandler } from './create-ticket.handler';
import { AnalyzeTicketHandler } from './analyze-ticket.handler';

export const TICKET_COMMAND_HANDLERS = [
  CreateTicketHandler,
  AnalyzeTicketHandler,
];
