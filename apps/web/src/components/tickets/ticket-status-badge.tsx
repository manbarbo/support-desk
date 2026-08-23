import type { TicketStatus } from "@/types/ticket";
import { cn } from "@/lib/utils";

const statusStyles: Record<TicketStatus, string> = {
  OPEN: "bg-zinc-600 text-zinc-100",
  PROCESSING: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
  ANALYZED: "bg-green-600/20 text-green-400 border border-green-600/30",
  FAILED: "bg-red-600/20 text-red-400 border border-red-600/30",
  RESOLVED: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}
