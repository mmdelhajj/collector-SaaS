"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Save } from "lucide-react";
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
import type { Plan } from "@/lib/super-admin";
import { createPlanAction, savePlanAction } from "./actions";

type Mode = "edit" | "create";

const EMPTY: Plan = {
  id: 0,
  code: "",
  name: "",
  description: "",
  price_monthly: 0,
  price_annual: null,
  limit_customers: null,
  limit_users: null,
  limit_collectors: null,
  feature_radius: true,
  feature_whatsapp: false,
  feature_sms: false,
  feature_priority_support: false,
  is_public: true,
  sort_order: 0,
  tenants_count: 0,
  created_at: null,
  updated_at: null,
};

export function PlanEditSheet({
  mode,
  plan,
  trigger,
}: {
  mode: Mode;
  plan?: Plan;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const initial = mode === "edit" && plan ? plan : EMPTY;

  // Form state
  const [code, setCode] = useState(initial.code);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [priceMonthly, setPriceMonthly] = useState(
    String(initial.price_monthly),
  );
  const [priceAnnual, setPriceAnnual] = useState(
    initial.price_annual !== null ? String(initial.price_annual) : "",
  );
  const [limitCustomers, setLimitCustomers] = useState(
    initial.limit_customers !== null ? String(initial.limit_customers) : "",
  );
  const [limitUsers, setLimitUsers] = useState(
    initial.limit_users !== null ? String(initial.limit_users) : "",
  );
  const [limitCollectors, setLimitCollectors] = useState(
    initial.limit_collectors !== null ? String(initial.limit_collectors) : "",
  );
  const [featRadius, setFeatRadius] = useState(initial.feature_radius);
  const [featWhatsapp, setFeatWhatsapp] = useState(initial.feature_whatsapp);
  const [featSms, setFeatSms] = useState(initial.feature_sms);
  const [featPriority, setFeatPriority] = useState(
    initial.feature_priority_support,
  );
  const [isPublic, setIsPublic] = useState(initial.is_public);
  const [sortOrder, setSortOrder] = useState(String(initial.sort_order));
  const [isPending, startTransition] = useTransition();

  function submit() {
    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || null,
      price_monthly: Number(priceMonthly) || 0,
      price_annual: priceAnnual === "" ? null : Number(priceAnnual),
      limit_customers: limitCustomers === "" ? null : Number(limitCustomers),
      limit_users: limitUsers === "" ? null : Number(limitUsers),
      limit_collectors: limitCollectors === "" ? null : Number(limitCollectors),
      feature_radius: featRadius,
      feature_whatsapp: featWhatsapp,
      feature_sms: featSms,
      feature_priority_support: featPriority,
      is_public: isPublic,
      sort_order: Number(sortOrder) || 0,
    };

    startTransition(async () => {
      const res =
        mode === "edit" && plan
          ? await savePlanAction(plan.id, payload)
          : await createPlanAction(payload);
      if (res.ok) {
        toast.success(mode === "edit" ? "Plan saved" : "Plan created");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Save failed");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? `Edit ${initial.name}` : "Create plan"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Changes apply to all tenants on this plan immediately."
              : "Add a new pricing tier. You can always change limits later."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                placeholder="starter"
                maxLength={32}
                disabled={mode === "edit" && (plan?.tenants_count ?? 0) > 0}
              />
              {mode === "edit" && (plan?.tenants_count ?? 0) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Locked — tenants reference this code.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Starter"
                maxLength={80}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Single-user shops getting off spreadsheets."
              maxLength={255}
            />
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pricing
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pm">Monthly (USD)</Label>
                <Input
                  id="pm"
                  type="number"
                  min={0}
                  step={1}
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pa">Annual (USD)</Label>
                <Input
                  id="pa"
                  type="number"
                  min={0}
                  step={1}
                  value={priceAnnual}
                  onChange={(e) => setPriceAnnual(e.target.value)}
                  placeholder="(blank = no annual option)"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Limits — leave blank for unlimited
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Limit
                id="lc"
                label="Customers"
                value={limitCustomers}
                onChange={setLimitCustomers}
              />
              <Limit
                id="lu"
                label="Staff users"
                value={limitUsers}
                onChange={setLimitUsers}
              />
              <Limit
                id="lcol"
                label="Collectors"
                value={limitCollectors}
                onChange={setLimitCollectors}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Features
            </p>
            <Toggle
              label="RADIUS / NAS integration"
              checked={featRadius}
              onChange={setFeatRadius}
            />
            <Toggle
              label="WhatsApp messaging"
              checked={featWhatsapp}
              onChange={setFeatWhatsapp}
            />
            <Toggle
              label="SMS messaging"
              checked={featSms}
              onChange={setFeatSms}
            />
            <Toggle
              label="Priority support"
              checked={featPriority}
              onChange={setFeatPriority}
            />
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visibility
            </p>
            <Toggle
              label="Listed on public signup page"
              checked={isPublic}
              onChange={setIsPublic}
              hint="Hide private/legacy plans (super-admin can still assign them)."
            />
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="sort">Sort order</Label>
              <Input
                id="sort"
                type="number"
                min={0}
                step={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="max-w-[120px]"
              />
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
            ) : mode === "edit" ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {mode === "edit" ? "Save changes" : "Create plan"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Limit({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="∞"
      />
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border"
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
    </label>
  );
}
