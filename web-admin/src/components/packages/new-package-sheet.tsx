"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  createPackageAction,
  type CreatePackageState,
} from "@/app/(dashboard)/packages/actions";
import { BILLING_PERIODS, BILLING_TYPES } from "@/lib/packages-types";

export function NewPackageSheet() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    CreatePackageState | undefined,
    FormData
  >(createPackageAction, undefined);

  useEffect(() => {
    if (state?.ok && state.pkg) {
      toast.success(`${state.pkg.name} created`, {
        description: "It's now available to assign to subscriptions.",
      });
      setOpen(false);
    }
  }, [state]);

  const fe = state?.fieldErrors ?? {};

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
        <Plus className="size-4" />
        New package
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New package</SheetTitle>
          <SheetDescription>
            Define a service plan: pricing, billing cycle, speeds, and the
            FreeRADIUS group it maps to.
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
            label="Name"
            name="name"
            placeholder="Gold 100Mbps"
            required
            errors={fe.name}
          />

          <Field
            label="Code"
            name="code"
            placeholder="GOLD-100"
            required
            errors={fe.code}
          />

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Optional summary shown on invoices and receipts."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Billing type"
              name="billing_type"
              defaultValue="recurring"
              options={BILLING_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Select
              label="Billing period"
              name="billing_period"
              defaultValue="monthly"
              options={BILLING_PERIODS.map((p) => ({ value: p, label: p }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Price (USD)"
              name="price"
              type="number"
              inputMode="decimal"
              placeholder="40"
              required
              errors={fe.price}
            />
            <Field
              label="RADIUS group"
              name="radius_group_name"
              placeholder="gold_100"
              errors={fe.radius_group_name}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Down (Mbps)"
              name="speed_down_mbps"
              type="number"
              placeholder="100"
              errors={fe.speed_down_mbps}
            />
            <Field
              label="Up (Mbps)"
              name="speed_up_mbps"
              type="number"
              placeholder="50"
              errors={fe.speed_up_mbps}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="is_active" name="is_active" defaultChecked />
            <Label
              htmlFor="is_active"
              className="text-sm font-normal text-muted-foreground"
            >
              Active — available for new subscriptions
            </Label>
          </div>

          <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t px-0 pt-4">
            <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
              Cancel
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create package"
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
}: {
  label: string;
  name: string;
  type?: string;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  required?: boolean;
  errors?: string[];
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
    </div>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="capitalize">
        {label}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm capitalize shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
