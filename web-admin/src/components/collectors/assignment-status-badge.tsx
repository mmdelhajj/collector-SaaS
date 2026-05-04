import { cn } from "@/lib/utils";
import type { AssignmentStatus } from "@/lib/collectors-types";

const STYLES: Record<AssignmentStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400",
  in_progress:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-400",
  completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400",
  failed:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400",
  reassigned:
    "bg-zinc-100 text-zinc-600 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300",
};

const DOTS: Record<AssignmentStatus, string> = {
  pending: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
  reassigned: "bg-zinc-400",
};

const LABELS: Record<AssignmentStatus, string> = {
  pending: "Pending",
  in_progress: "On route",
  completed: "Done",
  failed: "Failed",
  reassigned: "Reassigned",
};

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[status])} />
      {LABELS[status]}
    </span>
  );
}
