"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
  deletePackageAction,
  updatePackageAction,
  type CreatePackageState,
  type UpdatePackageState,
} from "@/app/(dashboard)/packages/actions";
import {
  BILLING_PERIODS,
  BILLING_TYPES,
  type Package,
} from "@/lib/packages-types";

type Mode = { kind: "create" } | { kind: "edit"; pkg: Package };

export function PackageSheet({
  mode,
  triggerVariant = "primary",
}: {
  mode: Mode;
  triggerVariant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const isEdit = mode.kind === "edit";

  // Bind the update action to the package id when editing.
  const boundAction = isEdit
    ? updatePackageAction.bind(null, mode.pkg.id)
    : createPackageAction;

  const [state, formAction, isPending] = useActionState<
    CreatePackageState | UpdatePackageState | undefined,
    FormData
  >(boundAction, undefined);

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (state?.ok && state.pkg) {
      toast.success(
        isEdit ? `${state.pkg.name} updated` : `${state.pkg.name} created`,
      );
      setOpen(false);
    }
  }, [state, isEdit]);

  async function handleDelete() {
    if (!isEdit) return;
    if (
      !confirm(
        `Delete "${mode.pkg.name}"? This cannot be undone. Packages with active subscriptions can't be deleted — reassign customers first.`,
      )
    )
      return;
    setIsDeleting(true);
    try {
      const res = await deletePackageAction(mode.pkg.id);
      if (res.ok) {
        toast.success("Package deleted");
        setOpen(false);
      } else {
        toast.error(
          res.subscriptionsCount
            ? `${res.error} (${res.subscriptionsCount} active subscriber${res.subscriptionsCount === 1 ? "" : "s"})`
            : (res.error ?? "Could not delete"),
        );
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const fe = state?.fieldErrors ?? {};
  const pkg = isEdit ? mode.pkg : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={
          triggerVariant === "primary"
            ? "inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            : "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        }
        aria-label={isEdit ? "Edit package" : "New package"}
      >
        {isEdit ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <Plus className="size-4" />
            New package
          </>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit package" : "New package"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Changes apply to new subscriptions immediately. Existing customers keep their current pricing until renewal."
              : "Define a service plan: pricing, billing cycle, speeds, and the FreeRADIUS group it maps to."}
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
            required={!isEdit}
            defaultValue={pkg?.name}
            errors={fe.name}
          />

          <Field
            label="Code"
            name="code"
            placeholder="GOLD-100"
            required={!isEdit}
            defaultValue={pkg?.code}
            errors={fe.code}
          />

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Optional summary shown on invoices and receipts."
              defaultValue={pkg?.description ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Billing type"
              name="billing_type"
              defaultValue={pkg?.billing_type ?? "recurring"}
              options={BILLING_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Select
              label="Billing period"
              name="billing_period"
              defaultValue={pkg?.billing_period ?? "monthly"}
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
              required={!isEdit}
              defaultValue={pkg ? String(pkg.price) : undefined}
              errors={fe.price}
            />
            <Field
              label="RADIUS group"
              name="radius_group_name"
              placeholder="gold_100"
              defaultValue={pkg?.radius_group_name ?? ""}
              errors={fe.radius_group_name}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Down (Mbps)"
              name="speed_down_mbps"
              type="number"
              placeholder="100"
              defaultValue={
                pkg?.speed_down_mbps != null ? String(pkg.speed_down_mbps) : ""
              }
              errors={fe.speed_down_mbps}
            />
            <Field
              label="Up (Mbps)"
              name="speed_up_mbps"
              type="number"
              placeholder="50"
              defaultValue={
                pkg?.speed_up_mbps != null ? String(pkg.speed_up_mbps) : ""
              }
              errors={fe.speed_up_mbps}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              name="is_active"
              defaultChecked={pkg ? pkg.is_active : true}
            />
            <Label
              htmlFor="is_active"
              className="text-sm font-normal text-muted-foreground"
            >
              Active — available for new subscriptions
            </Label>
          </div>

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 border-t px-0 pt-4">
            {isEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting || isPending}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
                Cancel
              </SheetClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {isEdit ? "Saving…" : "Creating…"}
                  </>
                ) : isEdit ? (
                  "Save changes"
                ) : (
                  "Create package"
                )}
              </Button>
            </div>
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
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  required?: boolean;
  errors?: string[];
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
