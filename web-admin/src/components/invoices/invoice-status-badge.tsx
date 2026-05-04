import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/invoices-types";

const STYLES: Record<InvoiceStatus, string> = {
  draft:
    "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300 dark:ring-zinc-400/20",
  open: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-400/30",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-400/30",
  partial:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-400/30",
  overdue:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-400/30",
  cancelled:
    "bg-zinc-100 text-zinc-500 ring-zinc-600/20 line-through dark:bg-zinc-900/60",
  void: "bg-zinc-100 text-zinc-500 ring-zinc-600/20 line-through dark:bg-zinc-900/60",
};

const DOTS: Record<InvoiceStatus, string> = {
  draft: "bg-zinc-400",
  open: "bg-blue-500",
  paid: "bg-emerald-500",
  partial: "bg-amber-500",
  overdue: "bg-red-500",
  cancelled: "bg-zinc-400",
  void: "bg-zinc-400",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
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
