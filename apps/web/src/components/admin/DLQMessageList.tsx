import { getDLQMessages } from "@/features/dlq/api/dlq.api";
import { DLQMessageCard } from "./DLQMessageCard";
import { DLQActions } from "./DLQActions";

export async function DLQMessageList() {
  let messages;

  try {
    const result = await getDLQMessages();
    messages = result.messages;
  } catch (error) {
    return (
      <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-400">
          Error loading DLQ
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {error instanceof Error ? error.message : "Failed to load DLQ messages"}
        </p>
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
        <DLQActions messageCount={messages.length} />
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
            <DLQMessageCard key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}
