import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  FileText,
  Hourglass,
  Pause,
  Settings,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { getPlatformOverview } from "@/lib/super-admin";

export const metadata: Metadata = { title: "Platform · Super-admin" };

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export default async function SuperAdminDashboard() {
  const o = await getPlatformOverview();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live across every tenant on this server.
        </p>
      </div>

      {/* Revenue */}
      <section className="rounded-xl border bg-gradient-to-br from-primary/5 to-emerald-50/40 p-6 dark:from-primary/10 dark:to-emerald-950/20">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Subscription revenue
        </h2>
        <div className="mt-3 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              MRR
            </p>
            <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums">
              {FORMAT_MONEY(o.mrr)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              ARR
            </p>
            <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums">
              {FORMAT_MONEY(o.arr)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Collected (last 30d, all tenants)
            </p>
            <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums">
              {FORMAT_MONEY(o.collected_30d)}
            </p>
          </div>
        </div>
      </section>

      {/* Tenant status */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={Building2}
          label="Tenants total"
          value={o.tenants.total}
          tone="primary"
        />
        <Card
          icon={Hourglass}
          label="On trial"
          value={o.tenants.trial}
          tone="amber"
        />
        <Card
          icon={CheckCircle}
          label="Paying"
          value={o.tenants.active}
          tone="emerald"
        />
        <Card
          icon={Pause}
          label="Suspended"
          value={o.tenants.suspended}
          tone="rose"
        />
      </section>

      {/* Aggregate counts */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Users} label="Staff users" value={o.users} />
        <Card icon={Users} label="End customers" value={o.customers} />
        <Card icon={FileText} label="Invoices" value={o.invoices} />
        <Card icon={Wallet} label="Payments" value={o.payments} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/40"
        >
          <Building2 className="size-4 text-primary" />
          View tenants list
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/40"
        >
          <Building2 className="size-4 text-primary" />
          Provision new tenant
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/super-admin/plans"
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/40"
        >
          <Tag className="size-4 text-primary" />
          Plans &amp; pricing
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/super-admin/settings"
          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/40"
        >
          <Settings className="size-4 text-primary" />
          Platform settings
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "primary" | "amber" | "emerald" | "rose";
}) {
  const colors = {
    primary: "text-primary",
    amber: "text-amber-700 dark:text-amber-400",
    emerald: "text-emerald-700 dark:text-emerald-400",
    rose: "text-rose-700 dark:text-rose-400",
  } as const;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className={`size-3.5 ${tone ? colors[tone] : ""}`} />
        {label}
      </div>
      <p
        className={`mt-1 font-mono text-2xl font-bold tabular-nums ${tone ? colors[tone] : ""}`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
