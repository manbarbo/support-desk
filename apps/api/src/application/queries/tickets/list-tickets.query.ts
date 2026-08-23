export interface ListTicketsFilters {
  status?: string;
  priority?: string;
  category?: string;
  customerId?: string;
}

export class ListTicketsQuery {
  constructor(public readonly filters?: ListTicketsFilters) {}
}
