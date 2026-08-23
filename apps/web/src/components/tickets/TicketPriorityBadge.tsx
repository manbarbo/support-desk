import type { TicketPriority } from "@/features/tickets/types/ticket.types";
import { cn } from "@/lib/utils";

const priorityStyles: Record<TicketPriority, string> = {
  LOW: "bg-zinc-600 text-zinc-300",
  MEDIUM: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
  HIGH: "bg-orange-600/20 text-orange-400 border border-orange-600/30",
  URGENT: "bg-red-600/20 text-red-400 border border-red-600/30",
};

export function TicketPriorityBadge({
  priority,
}: {
  priority: TicketPriority;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        priorityStyles[priority],
      )}
    >
      {priority}
    </span>
  );
}
