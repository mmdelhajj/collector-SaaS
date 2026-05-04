import { cn } from "@/lib/utils";
import { ROLE_LABELS, type TenantRole } from "@/lib/users-types";

const STYLES: Record<TenantRole, string> = {
  tenant_owner: "bg-primary/10 text-primary ring-primary/30",
  tenant_admin:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/40 dark:text-violet-400",
  manager:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-400",
  accountant:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400",
  support:
    "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950/40 dark:text-cyan-400",
  technician:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400",
  collector:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950/40 dark:text-orange-400",
  customer:
    "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300",
};

export function RoleBadge({ role }: { role: TenantRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
