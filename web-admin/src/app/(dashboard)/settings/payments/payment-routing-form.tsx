"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PaymentSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { savePaymentRoutingAction } from "./actions";

const METHOD_META: Record<
  string,
  { label: string; icon: typeof Banknote; hint: string }
> = {
  cash: {
    label: "Cash",
    icon: Banknote,
    hint: "Physical bills the collector carries.",
  },
  whish: {
    label: "Whish",
    icon: Smartphone,
    hint: "Lebanese mobile money — can be sent to either a personal or company wallet.",
  },
  omt: {
    label: "OMT",
    icon: Smartphone,
    hint: "OMT transfer — usually direct to company.",
  },
  areeba: {
    label: "Areeba",
    icon: Smartphone,
    hint: "Areeba mobile money.",
  },
  card: {
    label: "Card",
    icon: CreditCard,
    hint: "Visa / Mastercard — always direct to company.",
  },
  bank_transfer: {
    label: "Bank transfer",
    icon: Building2,
    hint: "Direct to company bank account.",
  },
  stripe: {
    label: "Stripe",
    icon: CreditCard,
    hint: "Online card — always direct to company.",
  },
  other: {
    label: "Other",
    icon: Wallet,
    hint: "Any other channel — choose based on how it actually flows.",
  },
};

// Methods that fundamentally can't go via the collector — locked.
const ALWAYS_DIRECT = new Set(["card", "stripe", "bank_transfer"]);

export function PaymentRoutingForm({ initial }: { initial: PaymentSettings }) {
  const [routing, setRouting] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const m of initial.available_methods) {
      out[m] = initial.handover_methods.includes(m);
    }
    return out;
  });
  const [isPending, startTransition] = useTransition();

  function toggle(method: string) {
    if (ALWAYS_DIRECT.has(method)) return;
    setRouting((prev) => ({ ...prev, [method]: !prev[method] }));
  }

  function save() {
    const handoverMethods = Object.entries(routing)
      .filter(([m, v]) => v && !ALWAYS_DIRECT.has(m))
      .map(([m]) => m);

    startTransition(async () => {
      const res = await savePaymentRoutingAction(handoverMethods);
      if (res.ok) toast.success("Saved");
      else toast.error(res.error ?? "Could not save");
    });
  }

  const handoverCount = Object.entries(routing).filter(
    ([, v]) => v,
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/20 p-4 text-sm">
        <p className="font-medium">Currently:</p>
        <p className="mt-1 text-muted-foreground">
          {handoverCount === 0 ? (
            <>
              No methods need a handover. Collectors will never see the
              &ldquo;Hand over cash&rdquo; banner — every payment is assumed
              to land directly in the company wallet.
            </>
          ) : (
            <>
              <span className="font-mono text-foreground">
                {handoverCount}
              </span>{" "}
              method{handoverCount === 1 ? "" : "s"} require a handover from
              the collector at end of day.
            </>
          )}
        </p>
      </div>

      <ul className="space-y-2">
        {initial.available_methods.map((m) => {
          const meta = METHOD_META[m] ?? {
            label: m,
            icon: Wallet,
            hint: "",
          };
          const Icon = meta.icon;
          const locked = ALWAYS_DIRECT.has(m);
          const isHandover = !!routing[m];
          return (
            <li
              key={m}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 transition-colors",
                isHandover
                  ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20"
                  : "bg-card",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                  isHandover
                    ? "bg-amber-100 text-amber-700 ring-amber-600/20"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {meta.label}
                  {locked && (
                    <span className="ms-2 inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <CheckCircle2 className="size-2.5" />
                      always direct
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{meta.hint}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  disabled={locked || isPending}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    locked
                      ? "bg-emerald-200 cursor-not-allowed"
                      : isHandover
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  aria-label={`Toggle handover for ${meta.label}`}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform",
                      isHandover && "translate-x-5",
                    )}
                  />
                </button>
                <p
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider",
                    isHandover
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {isHandover ? "Via collector" : "Direct"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold text-foreground">
            What this controls:
          </span>{" "}
          methods set to <b>Via collector</b> show up in the green &ldquo;In
          your hands&rdquo; banner on <code>/my-route</code> and need an
          end-of-day handover. <b>Direct</b> methods skip handover entirely —
          the money is assumed to be in the company account already.
        </span>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" onClick={save} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}
