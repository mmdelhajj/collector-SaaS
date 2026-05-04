import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Layers,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  getAgingReport,
  getCollectorPerformance,
  getDashboardReport,
  getRevenueReport,
} from "@/lib/reports";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { AgingBars } from "@/components/reports/aging-bars";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number | null) {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default async function ReportsPage() {
  let dashboard: Awaited<ReturnType<typeof getDashboardReport>>;
  let aging: Awaited<ReturnType<typeof getAgingReport>>;
  let collectors: Awaited<ReturnType<typeof getCollectorPerformance>>;
  let revenue: Awaited<ReturnType<typeof getRevenueReport>>;

  try {
    [dashboard, aging, collectors, revenue] = await Promise.all([
      getDashboardReport(),
      getAgingReport(),
      getCollectorPerformance(),
      getRevenueReport(),
    ]);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 400) {
        const user = await getCurrentUser();
        return <NoTenantContext email={user?.email ?? ""} />;
      }
    }
    throw err;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live numbers across collection, aging, and revenue. Click an export
            link on any section to download a CSV for accounting.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Collected today"
          value={formatMoney(dashboard.collected_today)}
          icon={Wallet}
        />
        <KpiCard
          label="Collected this month"
          value={formatMoney(dashboard.collected_this_month)}
          delta={dashboard.mom_change_pct}
          hint={`vs ${formatMoney(dashboard.collected_last_month)} last month`}
          icon={TrendingUp}
        />
        <KpiCard
          label="Outstanding"
          value={formatMoney(dashboard.total_outstanding)}
          hint={`${formatMoney(dashboard.overdue_outstanding)} overdue`}
          icon={Layers}
          accent={dashboard.overdue_outstanding > 0}
        />
        <KpiCard
          label="Active customers"
          value={dashboard.active_customers.toString()}
          hint={`${dashboard.suspended_customers} suspended`}
          icon={Users}
        />
      </div>

      {/* AR aging */}
      <Section
        title="Accounts receivable — aging"
        subtitle={`${aging.invoice_count} unpaid invoice${aging.invoice_count === 1 ? "" : "s"} · ${formatMoney(aging.total)} owed`}
        exportType="aging"
      >
        <AgingBars report={aging} />
      </Section>

      {/* Collector performance */}
      <Section
        title="Collector performance"
        subtitle={`Last 30 days · since ${new Date(collectors.since).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
        exportType="collectors"
      >
        {collectors.data.length === 0 ? (
          <Empty message="No collector activity in the last 30 days." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Collector</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-center">Assigned</TableHead>
                <TableHead className="text-center">Done</TableHead>
                <TableHead className="text-center">Failed</TableHead>
                <TableHead className="text-right">Success rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectors.data.map((c) => (
                <TableRow key={c.user_id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatMoney(c.collected)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {c.assignments_total}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-emerald-700 dark:text-emerald-400">
                    {c.assignments_completed}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-red-700 dark:text-red-400">
                    {c.assignments_failed}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.success_rate != null
                      ? `${c.success_rate.toFixed(1)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Revenue by category */}
      <Section
        title="Revenue by service category"
        subtitle={`Since ${new Date(revenue.since).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
        exportType="revenue"
      >
        {revenue.data.length === 0 ? (
          <Empty message="No invoices issued in this period." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Collection rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenue.data.map((r) => (
                <TableRow key={r.category_name}>
                  <TableCell className="font-medium">
                    {r.category_name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatMoney(r.billed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(r.collected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.collection_rate != null
                      ? `${r.collection_rate.toFixed(1)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          accent && "text-foreground",
        )}
      >
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {delta != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              delta >= 0
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
            )}
          >
            {delta >= 0 ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {formatPct(delta)}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  exportType,
  children,
}: {
  title: string;
  subtitle: string;
  exportType: "aging" | "collectors" | "revenue";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <a
          href={`/api/reports/export?type=${exportType}`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          download
        >
          <Download className="size-4" />
          Export CSV
        </a>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function NoTenantContext({ email }: { email: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:px-8">
      <div className="rounded-2xl border bg-card p-8 shadow-sm sm:p-10">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertCircle className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              No tenant selected
            </h1>
            <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
              Sign in as a tenant admin (e.g.{" "}
              <span className="font-mono text-foreground">{email}</span> needs a
              tenant) to view reports.
            </p>
            <div className="mt-6">
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in as a tenant admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
