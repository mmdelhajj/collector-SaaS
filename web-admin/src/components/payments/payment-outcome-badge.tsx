import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Outcome = "cleared" | "partial" | "unallocated" | "refunded" | "pending" | "failed";

const META: Record<
  Outcome,
  { label: string; icon: LucideIcon; classes: string; sub?: string }
> = {
  cleared: {
    label: "Cleared",
    icon: CheckCircle2,
    classes:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400",
    sub: "Invoice fully paid",
  },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    classes:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400",
    sub: "Balance still owed",
  },
  unallocated: {
    label: "Unallocated",
    icon: CheckCircle2,
    classes:
      "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/40 dark:text-sky-400",
    sub: "Not linked to an invoice",
  },
  refunded: {
    label: "Refunded",
    icon: RotateCcw,
    classes: "bg-zinc-100 text-zinc-600 ring-zinc-600/20 line-through",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    classes: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    classes: "bg-red-50 text-red-700 ring-red-600/20",
  },
};

/**
 * One badge that says what the payment **actually did to the invoice** —
 * combining the payment.status (completed / refunded / failed / pending)
 * with the invoice's resulting balance (cleared / partial / unallocated).
 */
export function paymentOutcome(
  paymentStatus: string,
  invoice: { balance_due: number; status: string } | null | undefined,
): Outcome {
  if (paymentStatus === "refunded") return "refunded";
  if (paymentStatus === "failed") return "failed";
  if (paymentStatus === "pending") return "pending";
  if (!invoice) return "unallocated";
  if (invoice.balance_due <= 0 || invoice.status === "paid") return "cleared";
  return "partial";
}

export function PaymentOutcomeBadge({
  status,
  invoice,
  showSub = false,
}: {
  status: string;
  invoice: { balance_due: number; status: string } | null | undefined;
  showSub?: boolean;
}) {
  const outcome = paymentOutcome(status, invoice);
  const meta = META[outcome];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
          meta.classes,
        )}
      >
        <Icon className="size-3" />
        {meta.label}
      </span>
      {showSub && meta.sub && (
        <span className="text-[10px] text-muted-foreground">{meta.sub}</span>
      )}
    </div>
  );
}
