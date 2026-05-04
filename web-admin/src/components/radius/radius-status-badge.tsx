import { cn } from "@/lib/utils";
import type { RadiusStatus } from "@/lib/radius-types";

const STYLES: Record<RadiusStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400",
  suspended:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400",
  throttled:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400",
  terminated:
    "bg-zinc-100 text-zinc-600 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300",
};

const DOTS: Record<RadiusStatus, string> = {
  active: "bg-emerald-500",
  suspended: "bg-red-500",
  throttled: "bg-amber-500",
  terminated: "bg-zinc-400",
};

export function RadiusStatusBadge({ status }: { status: RadiusStatus }) {
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
