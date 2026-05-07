"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  CheckCircle,
  CreditCard,
  Loader2,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  deleteTenantAction,
  reactivateTenantAction,
  suspendTenantAction,
  updateTenantAction,
} from "./actions";

export function TenantActions({
  id,
  status,
  name,
  slug,
  plan,
  billingPeriod,
}: {
  id: string;
  status: string;
  name: string;
  slug: string;
  plan: string;
  billingPeriod: string;
}) {
  const [isPending, startTransition] = useTransition();

  function suspend() {
    if (!confirm(`Suspend ${name}? Users lose access until reactivated.`))
      return;
    startTransition(async () => {
      const res = await suspendTenantAction(id);
      if (res.ok) toast.success("Suspended");
      else toast.error(res.error ?? "Could not suspend");
    });
  }

  function reactivate() {
    startTransition(async () => {
      const res = await reactivateTenantAction(id);
      if (res.ok) toast.success("Reactivated");
      else toast.error(res.error ?? "Could not reactivate");
    });
  }

  function activate() {
    if (
      !confirm(
        `Mark ${name} as paying (active)? Use only after they've paid you.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await updateTenantAction(id, { status: "active" });
      if (res.ok) toast.success("Marked active");
      else toast.error(res.error ?? "Could not save");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <p className="me-auto text-sm font-medium">Subscription controls:</p>

      {status !== "suspended" && status !== "active" && (
        <Button
          onClick={activate}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle className="size-4" />
          )}
          Mark as paying
        </Button>
      )}

      <ChangePlanButton
        id={id}
        currentPlan={plan}
        currentBilling={billingPeriod}
      />

      <ExtendTrialButton id={id} />

      {status === "suspended" ? (
        <Button onClick={reactivate} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Reactivate
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={suspend}
          disabled={isPending}
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Pause className="size-4" />
          )}
          Suspend
        </Button>
      )}

      <DeleteTenantButton id={id} name={name} slug={slug} />
    </div>
  );
}

function DeleteTenantButton({
  id,
  name,
  slug,
}: {
  id: string;
  name: string;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (confirmInput !== slug) {
      toast.error(`Type the slug exactly: ${slug}`);
      return;
    }
    startTransition(async () => {
      const res = await deleteTenantAction(id, confirmInput);
      // On success the action redirects to /super-admin/tenants, so we only
      // get here on error.
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-400 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100">
        <Trash2 className="size-4" />
        Delete
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-rose-700">Delete tenant</SheetTitle>
          <SheetDescription>
            Permanently removes <span className="font-semibold">{name}</span>{" "}
            and every record it owns: users, customers, invoices, payments,
            messages, RADIUS data, audit logs. This cannot be undone.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
            Consider <span className="font-semibold">Suspend</span> instead if
            the tenant might come back. Deletion is irreversible.
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type the workspace slug to confirm:{" "}
              <code className="font-mono">{slug}</code>
            </Label>
            <Input
              id="confirm"
              autoComplete="off"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={slug}
              className="font-mono"
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={isPending || confirmInput !== slug}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete permanently"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ChangePlanButton({
  id,
  currentPlan,
  currentBilling,
}: {
  id: string;
  currentPlan: string;
  currentBilling: string;
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(currentPlan as "starter" | "growth" | "pro");
  const [billing, setBilling] = useState(
    currentBilling as "monthly" | "annual",
  );
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await updateTenantAction(id, {
        plan,
        billing_period: billing,
      });
      if (res.ok) {
        toast.success("Plan updated");
        setOpen(false);
      } else toast.error(res.error ?? "Could not update plan");
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
        <CreditCard className="size-4" />
        Change plan
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Change plan</SheetTitle>
          <SheetDescription>
            Switch the subscription tier or billing period for this tenant.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["starter", "growth", "pro"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    plan === p
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <p className="text-sm font-semibold capitalize">{p}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing">Billing period</Label>
            <select
              id="billing"
              value={billing}
              onChange={(e) =>
                setBilling(e.target.value as "monthly" | "annual")
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save plan"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ExtendTrialButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(14);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (days < 1) {
      toast.error("Pick at least 1 day");
      return;
    }
    startTransition(async () => {
      const res = await updateTenantAction(id, { extend_trial_days: days });
      if (res.ok) {
        toast.success(`Trial extended ${days} day${days === 1 ? "" : "s"}`);
        setOpen(false);
      } else toast.error(res.error ?? "Could not extend");
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
        <Calendar className="size-4" />
        Extend trial
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Extend trial</SheetTitle>
          <SheetDescription>
            Push trial-ends-at forward by N days from its current value (or from
            today if already expired).
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="days">Days to add</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 0)}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className="rounded-md border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  +{d}
                </button>
              ))}
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              `Extend ${days} day${days === 1 ? "" : "s"}`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
