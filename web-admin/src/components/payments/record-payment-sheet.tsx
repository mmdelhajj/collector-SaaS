"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  recordPaymentAction,
  type RecordPaymentState,
} from "@/app/(dashboard)/payments/actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/payments-types";

export function RecordPaymentSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    RecordPaymentState | undefined,
    FormData
  >(recordPaymentAction, undefined);

  useEffect(() => {
    if (state?.ok && state.payment) {
      toast.success("Payment recorded", {
        description: `${state.payment.customerName} · $${state.payment.amount.toFixed(2)}`,
      });
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const fe = state?.fieldErrors ?? {};

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
        <Plus className="size-4" />
        Record payment
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Record a payment</SheetTitle>
          <SheetDescription>
            Apply the amount against an invoice (optional). The invoice status
            and the customer&rsquo;s outstanding balance will update
            automatically.
          </SheetDescription>
        </SheetHeader>

        <form
          action={formAction}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2"
        >
          {state?.error && !state.ok && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <Field
            label="Customer ID"
            name="customer_id"
            required
            placeholder="Paste a customer UUID"
            errors={fe.customer_id}
            hint="A customer-search dropdown is on the roadmap. For now, copy the ID from the customers page."
          />
          <Field
            label="Invoice ID"
            name="invoice_id"
            placeholder="Optional — paste an invoice UUID to apply against it"
            errors={fe.invoice_id}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Amount (USD)"
              name="amount"
              type="number"
              inputMode="decimal"
              placeholder="50"
              required
              errors={fe.amount}
            />
            <div className="space-y-1.5">
              <Label htmlFor="method">
                Method<span className="ms-0.5 text-destructive">*</span>
              </Label>
              <select
                id="method"
                name="method"
                defaultValue="cash"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
              {fe.method?.[0] && (
                <p className="text-xs text-destructive">{fe.method[0]}</p>
              )}
            </div>
          </div>

          <Field
            label="Reference / receipt number"
            name="reference_number"
            placeholder="e.g. WHISH-1234"
            errors={fe.reference_number}
          />

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Optional internal notes…"
            />
          </div>

          <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t px-0 pt-4">
            <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
              Cancel
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Recording…
                </>
              ) : (
                "Record payment"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  name,
  type = "text",
  inputMode,
  placeholder,
  required,
  errors,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  required?: boolean;
  errors?: string[];
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(errors?.length)}
      />
      {errors?.[0] && <p className="text-xs text-destructive">{errors[0]}</p>}
      {!errors?.length && hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
