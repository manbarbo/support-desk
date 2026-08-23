import { GetTicketHandler } from './get-ticket.handler';
import { ListTicketsHandler } from './list-tickets.handler';

export const TICKET_QUERY_HANDLERS = [GetTicketHandler, ListTicketsHandler];
