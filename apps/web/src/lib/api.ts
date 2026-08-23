import type { Ticket, CreateTicketDTO } from "@/types/ticket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchTickets(
  filters?: Record<string, string>,
): Promise<Ticket[]> {
  const params = new URLSearchParams(filters);
  const url = params.toString()
    ? `${API_URL}/tickets?${params}`
    : `${API_URL}/tickets`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch tickets: ${res.status}`);
  }

  return res.json();
}

export async function fetchTicket(id: string): Promise<Ticket> {
  const res = await fetch(`${API_URL}/tickets/${id}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Ticket not found: ${res.status}`);
  }

  return res.json();
}

export async function createTicket(data: CreateTicketDTO): Promise<Ticket> {
  const res = await fetch(`${API_URL}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to create ticket: ${res.status}`);
  }

  return res.json();
}
