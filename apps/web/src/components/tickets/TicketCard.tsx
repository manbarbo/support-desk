import Link from "next/link";
import type { Ticket } from "@/features/tickets/types/ticket.types";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketStatusBadge } from "./TicketStatusBadge";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <tr className="transition-colors hover:bg-zinc-800/50">
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
  );
}
