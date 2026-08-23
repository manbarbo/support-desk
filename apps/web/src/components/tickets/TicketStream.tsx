"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { env } from "@/config/env";

export function TicketStream() {
  const router = useRouter();

  useEffect(() => {
    const eventSource = new EventSource(`${env.apiUrl}/events/tickets/stream`);

    eventSource.addEventListener("ticket.updated", () => {
      router.refresh();
    });

    eventSource.onerror = () => {
      console.error("SSE connection error. Retrying...");
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  return null;
}
