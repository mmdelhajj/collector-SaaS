import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/payments-types";

const ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Landmark,
  whish: Smartphone,
  omt: Smartphone,
  areeba: Smartphone,
  stripe: CreditCard,
  other: Banknote,
};

const STYLES: Record<PaymentMethod, string> = {
  cash: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400",
  card: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-400",
  bank_transfer:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/40 dark:text-violet-400",
  whish:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950/40 dark:text-orange-400",
  omt: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400",
  areeba:
    "bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-950/40 dark:text-pink-400",
  stripe:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-400",
  other:
    "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300",
};

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const Icon = ICONS[method];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[method],
      )}
    >
      <Icon className="size-3" />
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}
