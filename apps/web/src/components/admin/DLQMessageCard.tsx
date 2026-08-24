"use client";

import { useState } from "react";
import type { DLQMessage } from "@/features/dlq/types/dlq.types";
import {
  reprocessDLQMessage,
  deleteDLQMessage,
} from "@/features/dlq/api/dlq.api";

interface DLQMessageCardProps {
  message: DLQMessage;
  onRefresh: () => void;
}

export function DLQMessageCard({ message, onRefresh }: DLQMessageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const handleReprocess = async () => {
    setIsProcessing(true);
    setActionResult(null);

    try {
      const result = await reprocessDLQMessage(message.id);
      setActionResult(result.message);
      onRefresh();
    } catch (err) {
      setActionResult(
        err instanceof Error ? err.message : "Failed to reprocess",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    setIsProcessing(true);
    setActionResult(null);

    try {
      const result = await deleteDLQMessage(message.id);
      setActionResult(result.message);
      onRefresh();
    } catch (err) {
      setActionResult(
        err instanceof Error ? err.message : "Failed to delete",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-blue-400">
            #{message.id.slice(0, 8)}
          </span>
          <span className="text-xs text-zinc-500">
            {new Date(message.timestamp).toLocaleString()}
          </span>
          {message.retryCount > 0 && (
            <span className="rounded-full bg-yellow-600/20 px-2 py-0.5 text-xs text-yellow-400">
              Retries: {message.retryCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
          <button
            onClick={handleReprocess}
            disabled={isProcessing}
            className="rounded bg-green-600/20 px-2 py-1 text-xs text-green-400 hover:bg-green-600/30 disabled:opacity-50"
          >
            {isProcessing ? "..." : "Reprocess"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400 hover:bg-red-600/30 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {actionResult && (
        <div className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-400">
          {actionResult}
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Original Queue:
              </span>
              <span className="ml-2 font-mono text-xs text-zinc-300">
                {message.originalQueue}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Last Error:
              </span>
              <span className="ml-2 text-xs text-red-400">
                {message.lastError}
              </span>
            </div>
            {message.lastErrorAt && (
              <div>
                <span className="text-xs font-medium text-zinc-500">
                  Error At:
                </span>
                <span className="ml-2 text-xs text-zinc-400">
                  {new Date(message.lastErrorAt).toLocaleString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-zinc-500">
                Content:
              </span>
              <pre className="mt-1 overflow-x-auto rounded bg-zinc-800 p-2 text-xs text-zinc-300">
                {JSON.stringify(message.content, null, 2)}
              </pre>
            </div>
            {Object.keys(message.headers).length > 0 && (
              <div>
                <span className="text-xs font-medium text-zinc-500">
                  Headers:
                </span>
                <pre className="mt-1 overflow-x-auto rounded bg-zinc-800 p-2 text-xs text-zinc-300">
                  {JSON.stringify(message.headers, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
