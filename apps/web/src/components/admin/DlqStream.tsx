"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { env } from "@/config/env";

export function DlqStream() {
  const router = useRouter();

  useEffect(() => {
    const eventSource = new EventSource(`${env.apiUrl}/events/dlq/stream`);

    eventSource.addEventListener("dlq.change", () => {
      router.refresh();
    });

    eventSource.onerror = () => {
      console.error("DLQ SSE connection error. Retrying...");
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  return null;
}
