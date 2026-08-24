"use client";

import { useState, useEffect } from "react";
import { getDLQMessages, reprocessAllDLQMessages } from "@/features/dlq/api/dlq.api";
import type { DLQMessage } from "@/features/dlq/types/dlq.types";
import { DLQMessageCard } from "./DLQMessageCard";

export function DLQMessageList() {
  const [messages, setMessages] = useState<DLQMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReprocessingAll, setIsReprocessingAll] = useState(false);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const result = await getDLQMessages();
      setMessages(result.messages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DLQ messages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleReprocessAll = async () => {
    if (!confirm("Are you sure you want to reprocess all messages?")) return;

    setIsReprocessingAll(true);
    try {
      const result = await reprocessAllDLQMessages();
      alert(`Reprocessed ${result.reprocessed} messages`);
      loadMessages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reprocess");
    } finally {
      setIsReprocessingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Loading DLQ messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-400">
          Error loading DLQ
        </h2>
        <p className="mt-2 text-sm text-zinc-400">{error}</p>
        <button
          onClick={loadMessages}
          className="mt-4 rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dead Letter Queue</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {messages.length} message{messages.length !== 1 ? "s" : ""} in DLQ
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadMessages}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Refresh
          </button>
          {messages.length > 0 && (
            <button
              onClick={handleReprocessAll}
              disabled={isReprocessingAll}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {isReprocessingAll ? "Reprocessing..." : "Reprocess All"}
            </button>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-lg font-medium text-zinc-300">
            No messages in DLQ
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            All messages have been processed successfully.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <DLQMessageCard
              key={message.id}
              message={message}
              onRefresh={loadMessages}
            />
          ))}
        </div>
      )}
    </div>
  );
}
