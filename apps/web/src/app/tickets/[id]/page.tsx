import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicket } from "@/features/tickets/api/tickets.api";
import { Header } from "@/components/layout/Header";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { TicketPriorityBadge } from "@/components/tickets/TicketPriorityBadge";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let ticket;

  try {
    ticket = await getTicket(id);
  } catch {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/tickets"
          className="mb-6 inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back to tickets
        </Link>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <div className="border-b border-zinc-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{ticket.title}</h1>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  #{ticket.id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {ticket.priority && (
                  <TicketPriorityBadge priority={ticket.priority} />
                )}
                <TicketStatusBadge status={ticket.status} />
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <h2 className="text-sm font-medium text-zinc-400">Description</h2>
            <p className="mt-2 text-sm text-zinc-200">{ticket.description}</p>
          </div>

          <div className="border-t border-zinc-800 px-6 py-4">
            <h2 className="text-sm font-medium text-zinc-400">Customer</h2>
            <p className="mt-2 text-sm text-zinc-200">{ticket.customerId}</p>
          </div>

          <div className="border-t border-zinc-800 px-6 py-4">
            <h2 className="text-sm font-medium text-zinc-400">Created</h2>
            <p className="mt-2 text-sm text-zinc-200">
              {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>

          {ticket.category && (
            <div className="border-t border-zinc-800 px-6 py-4">
              <h2 className="text-sm font-medium text-zinc-400">Category</h2>
              <p className="mt-2 text-sm text-zinc-200">{ticket.category}</p>
            </div>
          )}

          {ticket.sentiment && (
            <div className="border-t border-zinc-800 px-6 py-4">
              <h2 className="text-sm font-medium text-zinc-400">Sentiment</h2>
              <p className="mt-2 text-sm text-zinc-200">{ticket.sentiment}</p>
            </div>
          )}

          {ticket.confidence !== undefined && (
            <div className="border-t border-zinc-800 px-6 py-4">
              <h2 className="text-sm font-medium text-zinc-400">Confidence</h2>
              <p className="mt-2 text-sm text-zinc-200">
                {Math.round(ticket.confidence * 100)}%
              </p>
            </div>
          )}

          {ticket.suggestedResponse && (
            <div className="border-t border-zinc-800 px-6 py-4">
              <h2 className="text-sm font-medium text-zinc-400">
                Suggested Response
              </h2>
              <div className="mt-2 rounded-md bg-zinc-800/50 p-4 text-sm text-zinc-200">
                {ticket.suggestedResponse}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
