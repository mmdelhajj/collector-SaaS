import { cn } from "@/lib/utils";

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-400/30"
          : "bg-zinc-100 text-zinc-600 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300 dark:ring-zinc-400/20",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-zinc-400",
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
