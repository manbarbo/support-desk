"use client";

import { useState, useEffect } from "react";
import { getTickets } from "../api/tickets.api";
import type { Ticket } from "../types/ticket.types";

export function useTickets(filters?: Record<string, string>) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const data = await getTickets(filters);
        if (!cancelled) {
          setTickets(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(filters)]);

  return { tickets, isLoading, error };
}
