import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CreditCard,
  FileText,
  Hourglass,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { LocalDateTime } from "@/components/ui/local-datetime";
import { getAvailablePlans, getSubscription } from "@/lib/settings";
import { ChangePlanSheet } from "./change-plan-sheet";

export const metadata: Metadata = { title: "Subscription · Settings" };

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const STATUS_STYLES: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700 ring-amber-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  suspended: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default async function BillingPage() {
  const [sub, plans] = await Promise.all([
    getSubscription(),
    getAvailablePlans(),
  ]);

  const { tenant, plan, usage, limits } = sub;
  const isAnnual = tenant.billing_period === "annual";

  const currentPrice = plan
    ? isAnnual && plan.price_annual !== null
      ? plan.price_annual
      : plan.price_monthly
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CreditCard className="size-6 text-primary" />
          Subscription &amp; billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your plan with the platform, current usage, and trial status.
        </p>
      </div>

      {/* Current plan */}
      <section className="space-y-4 rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/[0.02] p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current plan
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Sparkles className="size-5 text-primary" />
              {plan?.name ?? "No plan assigned"}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
                  STATUS_STYLES[tenant.status] ?? ""
                }`}
              >
                {tenant.status}
              </span>
            </h2>
            {plan?.description && (
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {plan.description}
              </p>
            )}
          </div>
          <ChangePlanSheet
            currentCode={plan?.code ?? ""}
            currentPeriod={tenant.billing_period}
            plans={plans}
          />
        </header>

        {currentPrice !== null && (
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tabular-nums">
              {FORMAT_MONEY(currentPrice)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {isAnnual ? "year" : "month"}
            </span>
          </div>
        )}

        <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
          {tenant.trial_ends_at && (
            <DateCell
              icon={Hourglass}
              label="Trial ends"
              date={tenant.trial_ends_at}
              tone="amber"
            />
          )}
          {tenant.subscription_ends_at && (
            <DateCell
              icon={Calendar}
              label="Subscription ends"
              date={tenant.subscription_ends_at}
            />
          )}
          <DateCell
            icon={Calendar}
            label="Billed"
            value={isAnnual ? "Annual" : "Monthly"}
          />
        </div>
      </section>

      {/* Usage vs limits */}
      <section className="space-y-3 rounded-2xl border bg-card p-6">
        <header>
          <h2 className="text-base font-semibold">Usage this period</h2>
          <p className="text-xs text-muted-foreground">
            Counts of active resources against the limits in your plan.
          </p>
        </header>
        <UsageBar
          icon={Users}
          label="Customers"
          used={usage.customers}
          limit={limits.customers}
        />
        <UsageBar
          icon={Building2}
          label="Staff users"
          used={usage.users}
          limit={limits.users}
        />
        <UsageBar
          icon={Wrench}
          label="Collectors"
          used={usage.collectors}
          limit={limits.collectors}
        />
      </section>

      {/* Features */}
      {plan && (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-base font-semibold">Features included</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Feature
              on={plan.feature_radius}
              label="RADIUS / NAS integration"
            />
            <Feature on={plan.feature_whatsapp} label="WhatsApp messaging" />
            <Feature on={plan.feature_sms} label="SMS messaging" />
            <Feature
              on={plan.feature_priority_support}
              label="Priority support"
            />
          </div>
        </section>
      )}

      {/* Invoices placeholder */}
      <section className="rounded-2xl border border-dashed bg-card p-6">
        <header className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Payment history</h2>
        </header>
        <p className="mt-2 text-sm text-muted-foreground">
          Stripe + Whish/OMT integration is coming. Until then, your platform
          billing happens out-of-band — contact support for an invoice.
        </p>
      </section>
    </div>
  );
}

function DateCell({
  icon: Icon,
  label,
  date,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  date?: string;
  value?: string;
  tone?: "amber";
}) {
  const days = date
    ? Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold">
        {value ??
          (date ? (
            <LocalDateTime
              iso={date}
              mode="date"
              options={{ year: "numeric", month: "short", day: "numeric" }}
            />
          ) : (
            "—"
          ))}
      </p>
      {days !== null && days >= 0 && (
        <p
          className={`text-[11px] ${tone === "amber" ? "text-amber-700" : "text-muted-foreground"}`}
        >
          in {days} {days === 1 ? "day" : "days"}
        </p>
      )}
    </div>
  );
}

function UsageBar({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number;
  limit: number | null;
}) {
  const pct =
    limit !== null && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isUnlimited = limit === null;
  const warn = pct >= 90;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </span>
        <span className="font-mono tabular-nums">
          <span className="font-semibold">{used.toLocaleString()}</span>
          {" / "}
          {isUnlimited ? (
            <span className="text-emerald-700">unlimited</span>
          ) : (
            limit?.toLocaleString()
          )}
          {warn && !isUnlimited && (
            <AlertTriangle className="ms-1 inline size-3.5 text-amber-600" />
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${
              warn ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Feature({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check
        className={`size-4 ${on ? "text-emerald-600" : "text-muted-foreground/40"}`}
      />
      <span className={on ? "" : "text-muted-foreground/60 line-through"}>
        {label}
      </span>
    </div>
  );
}
