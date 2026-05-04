"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SubscriptionPlan } from "@/lib/settings";
import { changePlanAction } from "./actions";

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export function ChangePlanSheet({
  currentCode,
  currentPeriod,
  plans,
}: {
  currentCode: string;
  currentPeriod: string;
  plans: SubscriptionPlan[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(currentCode);
  const [period, setPeriod] = useState<"monthly" | "annual">(
    (currentPeriod as "monthly" | "annual") || "monthly",
  );
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (selectedCode === currentCode && period === currentPeriod) {
      toast.info("Already on that plan and period.");
      return;
    }
    startTransition(async () => {
      const res = await changePlanAction({
        plan_code: selectedCode,
        billing_period: period,
      });
      if (res.ok) {
        toast.success("Plan changed");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Change failed");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <ArrowLeftRight className="size-4" />
            Change plan
          </Button>
        }
      />
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Change subscription plan</SheetTitle>
          <SheetDescription>
            Pick a new plan or switch billing period. Changes apply
            immediately; payment reconciliation happens with your next
            invoice.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-2">
            <Label>Billing period</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "annual"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    period === p
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <p className="font-semibold capitalize">{p}</p>
                  {p === "annual" && (
                    <p className="text-[11px] text-muted-foreground">
                      Save when paying yearly (per plan)
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="space-y-2">
              {plans.map((p) => {
                const price =
                  period === "annual" && p.price_annual !== null
                    ? p.price_annual
                    : p.price_monthly;
                const unit = period === "annual" ? "/year" : "/month";
                const isCurrent = p.code === currentCode;
                const isSelected = p.code === selectedCode;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedCode(p.code)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{p.name}</p>
                          {isCurrent && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
                              Current
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>
                            <Limit value={p.limit_customers} /> customers
                          </span>
                          <span>
                            <Limit value={p.limit_users} /> users
                          </span>
                          <span>
                            <Limit value={p.limit_collectors} /> collectors
                          </span>
                          {p.feature_whatsapp && <Pill>WhatsApp</Pill>}
                          {p.feature_sms && <Pill>SMS</Pill>}
                          {p.feature_priority_support && (
                            <Pill>Priority support</Pill>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xl font-bold tabular-nums">
                          {FORMAT_MONEY(price)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {unit}
                        </p>
                        {isSelected && (
                          <Check className="ms-auto mt-1 size-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Confirm change
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Limit({ value }: { value: number | null }) {
  return (
    <span className="font-mono">
      {value === null ? "∞" : value.toLocaleString()}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
      {children}
    </span>
  );
}
