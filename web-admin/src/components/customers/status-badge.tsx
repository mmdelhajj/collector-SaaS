import { cn } from "@/lib/utils";
import type { CustomerStatus } from "@/lib/customers-types";

const STYLES: Record<CustomerStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-400/30",
  suspended:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-400/30",
  terminated:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-400/30",
  dormant:
    "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300 dark:ring-zinc-400/20",
  prospect:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-400/30",
};

const DOTS: Record<CustomerStatus, string> = {
  active: "bg-emerald-500",
  suspended: "bg-amber-500",
  terminated: "bg-red-500",
  dormant: "bg-zinc-400",
  prospect: "bg-blue-500",
};

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize",
        STYLES[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[status])} />
      {status}
    </span>
  );
}
