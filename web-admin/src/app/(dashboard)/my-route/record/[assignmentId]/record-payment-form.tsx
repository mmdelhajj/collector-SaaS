"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordPaymentAction, type RecordResult } from "./actions";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "whish", label: "Whish" },
  { value: "omt", label: "OMT" },
  { value: "areeba", label: "Areeba" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export function RecordPaymentForm({
  assignmentId,
  invoiceId,
  customerId,
  balanceDue,
}: {
  assignmentId: number;
  invoiceId: string;
  customerId: string;
  balanceDue: number;
}) {
  const [amount, setAmount] = useState(String(balanceDue.toFixed(2)));
  const [state, formAction, isPending] = useActionState<
    RecordResult | undefined,
    FormData
  >(recordPaymentAction, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const fe = state?.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border bg-card p-5"
    >
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input type="hidden" name="assignment_id" value={assignmentId} />

      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (USD)</Label>
        <div className="relative">
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="ps-7 font-mono text-lg"
            autoFocus
          />
        </div>
        {fe.amount?.[0] && (
          <p className="text-xs text-destructive">{fe.amount[0]}</p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[balanceDue, balanceDue / 2, balanceDue / 4]
            .filter((v) => v > 0)
            .map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAmount(v.toFixed(2))}
                className="rounded-md border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ${v.toFixed(2)}
              </button>
            ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="method">Method</Label>
        <select
          id="method"
          name="method"
          defaultValue="cash"
          required
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Reference number, agreement, etc."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Recording…
          </>
        ) : (
          "Record payment"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Receipt sent to customer automatically.
      </p>
    </form>
  );
}
