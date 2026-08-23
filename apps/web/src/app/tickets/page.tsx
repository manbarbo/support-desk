import Link from "next/link";
import { fetchTickets } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";

export default async function TicketsPage() {
  let tickets;

  try {
    tickets = await fetchTickets();
  } catch (error) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-400">
              Error connecting to API
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Make sure the backend is running on{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs">
                localhost:3001
              </code>
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <p className="text-zinc-400">No tickets yet</p>
            <Link
              href="/tickets/new"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Create your first ticket
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition-colors hover:bg-zinc-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-mono text-sm text-blue-400 hover:text-blue-300"
                      >
                        #{ticket.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-sm font-medium text-zinc-100 hover:text-white"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-400">
                      {ticket.customerId}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {ticket.priority ? (
                        <TicketPriorityBadge priority={ticket.priority} />
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-400">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
