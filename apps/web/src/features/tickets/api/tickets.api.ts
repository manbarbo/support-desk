import { apiClient } from "@/lib/api/client";
import type { Ticket, CreateTicketDTO } from "../types/ticket.types";

export async function getTickets(
  filters?: Record<string, string>,
): Promise<Ticket[]> {
  const params = new URLSearchParams(filters);
  const endpoint = params.toString() ? `/tickets?${params}` : "/tickets";

  return apiClient<Ticket[]>(endpoint, { cache: "no-store" });
}

export async function getTicket(id: string): Promise<Ticket> {
  return apiClient<Ticket>(`/tickets/${id}`, { cache: "no-store" });
}

export async function createTicket(data: CreateTicketDTO): Promise<Ticket> {
  return apiClient<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
