"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reprocessAllDLQMessages } from "@/features/dlq/api/dlq.api";

interface DLQActionsProps {
  messageCount: number;
}

export function DLQActions({ messageCount }: DLQActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleReprocessAll = () => {
    if (!confirm("Are you sure you want to reprocess all messages?")) return;

    startTransition(async () => {
      try {
        const result = await reprocessAllDLQMessages();
        alert(`Reprocessed ${result.reprocessed} messages`);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to reprocess");
      }
    });
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
      >
        {isPending ? "Loading..." : "Refresh"}
      </button>
      {messageCount > 0 && (
        <button
          onClick={handleReprocessAll}
          disabled={isPending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {isPending ? "Reprocessing..." : "Reprocess All"}
        </button>
      )}
    </div>
  );
}
