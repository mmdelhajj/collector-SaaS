"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Banknote, CheckCircle2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { PendingCash, SupervisorOption } from "@/lib/collector-self";
import { cn } from "@/lib/utils";
import { submitHandoverAction } from "./handover-actions";

export function HandoverSheet({
  pending,
  supervisors,
}: {
  pending: PendingCash;
  supervisors: SupervisorOption[];
}) {
  const [open, setOpen] = useState(false);
  const [supervisorId, setSupervisorId] = useState<number | null>(
    supervisors[0]?.id ?? null,
  );
  const [amount, setAmount] = useState(pending.expected_amount.toFixed(2));
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Re-sync amount when pending data changes (page revalidates).
  useEffect(() => {
    setAmount(pending.expected_amount.toFixed(2));
  }, [pending.expected_amount]);

  const declared = Number(amount) || 0;
  const expected = pending.expected_amount;
  const diff = declared - expected;

  function submit() {
    if (!supervisorId) {
      toast.error("Choose a supervisor");
      return;
    }
    startTransition(async () => {
      const res = await submitHandoverAction({
        to_user_id: supervisorId,
        amount: Number(amount),
        notes: notes.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Handover submitted", {
          description: "Awaiting supervisor confirmation.",
        });
        setOpen(false);
        setNotes("");
      } else {
        toast.error(res.error ?? "Could not submit");
      }
    });
  }

  if (pending.count === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
        Nothing to hand over right now — all your cash + mobile-money
        collections are accounted for. Card and bank transfers go directly to
        the company account.
      </div>
    );
  }

  const methodLabels: Record<string, string> = {
    cash: "Cash",
    whish: "Whish",
    omt: "OMT",
    areeba: "Areeba",
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-400">
            <Banknote className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
              In your hands:{" "}
              <span className="font-mono tabular-nums">
                ${pending.expected_amount.toFixed(2)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-400/90">
              {pending.count} payment{pending.count === 1 ? "" : "s"} ready to
              hand over to a supervisor.
            </p>
            {pending.breakdown_by_method && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {Object.entries(pending.breakdown_by_method).map(
                  ([method, info]) => (
                    <span
                      key={method}
                      className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-300"
                    >
                      {methodLabels[method] ?? method}: ${info.total.toFixed(2)}
                      <span className="opacity-60">({info.count})</span>
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
          <SheetTrigger className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700">
            Hand over →
          </SheetTrigger>
        </div>
      </div>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Hand over cash</SheetTitle>
          <SheetDescription>
            Submit the bundled cash to a supervisor. They&rsquo;ll count it and
            confirm or flag a discrepancy.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">System expects</span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                ${expected.toFixed(2)}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Sum of {pending.count} cash payment
              {pending.count === 1 ? "" : "s"} you&rsquo;ve recorded.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ho-supervisor">Hand over to</Label>
            <select
              id="ho-supervisor"
              value={supervisorId ?? ""}
              onChange={(e) => setSupervisorId(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {supervisors.length === 0 && (
                <option value="">— No supervisors available —</option>
              )}
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ho-amount">Amount you&rsquo;re handing over</Label>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="ho-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ps-7 font-mono text-lg"
                required
              />
            </div>
            {Math.abs(diff) > 0.01 && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs",
                  diff < 0
                    ? "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30"
                    : "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30",
                )}
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {diff < 0 ? "Short by " : "Over by "}
                  <span className="font-semibold tabular-nums">
                    ${Math.abs(diff).toFixed(2)}
                  </span>
                  . The supervisor will see this mismatch and may flag it — add
                  a note below to explain.
                </span>
              </div>
            )}
            {Math.abs(diff) <= 0.01 && (
              <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                Matches the system total exactly.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ho-notes">Notes (optional)</Label>
            <Textarea
              id="ho-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. $20 short — customer paid in LBP, exchanged at 89,000."
            />
          </div>

          <details className="rounded-lg border bg-card">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Show {pending.count} payment{pending.count === 1 ? "" : "s"} in
              this bundle
            </summary>
            <ul className="max-h-[280px] divide-y overflow-y-auto px-3 pb-3 text-xs">
              {pending.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      {p.customer?.full_name ?? "—"}
                      {p.invoice?.number && (
                        <span className="ms-1 font-mono text-[10px] text-muted-foreground">
                          {p.invoice.number}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      <span className="me-1 inline-block rounded bg-muted px-1 font-medium">
                        {methodLabels[p.method] ?? p.method}
                      </span>
                      {p.collected_at &&
                        new Date(p.collected_at).toLocaleString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-semibold">
                    ${p.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending || !supervisorId}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              `Submit handover ($${declared.toFixed(2)})`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
