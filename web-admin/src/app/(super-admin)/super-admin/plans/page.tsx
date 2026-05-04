import type { Metadata } from "next";
import {
  Building2,
  Check,
  CreditCard,
  EyeOff,
  Pencil,
  Plus,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPlans, type Plan } from "@/lib/super-admin";
import { DeletePlanButton } from "./delete-plan-button";
import { PlanEditSheet } from "./plan-edit-sheet";

export const metadata: Metadata = { title: "Plans · Super-admin" };

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export default async function PlansPage() {
  const plans = await listPlans();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Tag className="size-6 text-primary" />
            Plans &amp; pricing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscription tiers tenants can sign up for. Edit prices, limits,
            and features here — public ones show on the signup page.
          </p>
        </div>
        <PlanEditSheet
          mode="create"
          trigger={
            <Button className="gap-1.5">
              <Plus className="size-4" />
              New plan
            </Button>
          }
        />
      </div>

      {plans.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No plans yet. Click "New plan" to add one.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-6">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {plan.code}
          </p>
          <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
        </div>
        {!plan.is_public && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
            title="Hidden from public signup page"
          >
            <EyeOff className="size-3" />
            Hidden
          </span>
        )}
      </header>

      {plan.description && (
        <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
      )}

      <div className="mt-4 border-t pt-4">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-3xl font-bold tabular-nums">
            {FORMAT_MONEY(plan.price_monthly)}
          </span>
          <span className="text-xs text-muted-foreground">/ month</span>
        </div>
        {plan.price_annual !== null && (
          <p className="mt-1 text-xs text-muted-foreground">
            or <span className="font-semibold text-foreground">{FORMAT_MONEY(plan.price_annual)}</span>{" "}
            / year
            {plan.price_annual < plan.price_monthly * 12 && (
              <span className="ms-1 text-emerald-700">
                (save{" "}
                {Math.round(
                  100 - (plan.price_annual / (plan.price_monthly * 12)) * 100,
                )}
                %)
              </span>
            )}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <Limit label="Customers" value={plan.limit_customers} />
        <Limit label="Staff users" value={plan.limit_users} />
        <Limit label="Collectors" value={plan.limit_collectors} />
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <Feature on={plan.feature_radius} label="RADIUS / NAS" />
        <Feature on={plan.feature_whatsapp} label="WhatsApp" />
        <Feature on={plan.feature_sms} label="SMS" />
        <Feature on={plan.feature_priority_support} label="Priority support" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3.5" />
          {plan.tenants_count}{" "}
          {plan.tenants_count === 1 ? "tenant" : "tenants"}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px]">
          <CreditCard className="size-3" />
          sort #{plan.sort_order}
        </span>
      </div>

      <div className="mt-4 flex gap-2 border-t pt-3">
        <PlanEditSheet
          mode="edit"
          plan={plan}
          trigger={
            <Button variant="outline" size="sm" className="flex-1 gap-1.5">
              <Pencil className="size-4" />
              Edit
            </Button>
          }
        />
        <DeletePlanButton
          id={plan.id}
          name={plan.name}
          tenantsCount={plan.tenants_count}
        />
      </div>
    </div>
  );
}

function Limit({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">
        {value === null ? (
          <span className="text-emerald-700">unlimited</span>
        ) : (
          value.toLocaleString()
        )}
      </span>
    </div>
  );
}

function Feature({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {on ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <X className="size-4 text-muted-foreground/50" />
      )}
      <span className={on ? "" : "text-muted-foreground/60 line-through"}>
        {label}
      </span>
    </div>
  );
}
