import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  Mail,
  ShieldAlert,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getCollectorPeriod,
  type CollectorPeriodRange,
} from "@/lib/collector-period";
import { CollectionsChart } from "./collections-chart";
import { MethodPie } from "./method-pie";
import { ActivityTimeline } from "./activity-timeline";
import { RangeBar } from "./range-bar";

export const metadata: Metadata = { title: "Collector activity" };

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: v < 100 ? 2 : 0,
  }).format(v);

const RANGE_LABELS: Record<CollectorPeriodRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  month: "This month",
  year: "This year",
};

export default async function CollectorActivity({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ range?: string; date?: string }>;
}) {
  const { userId } = await params;
  const sp = await searchParams;
  const range = (
    ["today", "yesterday", "week", "month", "year"].includes(sp.range ?? "")
      ? sp.range
      : "today"
  ) as CollectorPeriodRange;
  const date = sp.date;

  let data;
  try {
    data = await getCollectorPeriod(Number(userId), range, date);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403))
      notFound();
    throw err;
  }

  const isDay = range === "today" || range === "yesterday";

  const initials = data.collector.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/collectors"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          All collectors
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 border">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {data.collector.name}
              </h1>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="size-3" />
                {data.collector.email}
              </p>
            </div>
          </div>

          <RangeBar
            current={range}
            userId={Number(userId)}
            anchor={data.anchor}
          />
        </div>
      </div>

      {/* Day-only header strip */}
      {isDay && data.route && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border bg-muted/20 px-4 py-2 text-xs">
          <span>
            <span className="me-1 text-muted-foreground">Started:</span>
            <span className="font-medium">
              {data.route.started_at
                ? new Date(data.route.started_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </span>
          <span>
            <span className="me-1 text-muted-foreground">Ended:</span>
            <span className="font-medium">
              {data.route.ended_at
                ? new Date(data.route.ended_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : data.route.started_at
                  ? "Still on route"
                  : "—"}
            </span>
          </span>
          {data.route.last_ping_at && (
            <span>
              <span className="me-1 text-muted-foreground">Last GPS ping:</span>
              <span className="font-medium">
                {new Date(data.route.last_ping_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Collected"
          value={FORMAT_MONEY(data.kpis.collected)}
          icon={Banknote}
          tone="emerald"
        />
        <Kpi
          label="Visits"
          value={String(data.kpis.visits)}
          hint={`${data.kpis.completed} done · ${data.kpis.failed} failed`}
          icon={Users}
        />
        <Kpi
          label="Success rate"
          value={
            data.kpis.success_rate != null ? `${data.kpis.success_rate}%` : "—"
          }
          icon={CheckCircle2}
          tone={
            data.kpis.success_rate != null && data.kpis.success_rate >= 70
              ? "emerald"
              : data.kpis.success_rate != null && data.kpis.success_rate < 50
                ? "rose"
                : undefined
          }
        />
        <Kpi
          label="Avg / active day"
          value={FORMAT_MONEY(data.kpis.avg_per_active_day)}
          icon={TrendingUp}
        />
        <Kpi
          label="Disputes"
          value={String(data.kpis.disputes)}
          icon={ShieldAlert}
          tone={data.kpis.disputes > 0 ? "rose" : undefined}
        />
      </div>

      {/* Chart row */}
      {!isDay && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold">
              Daily collections — {RANGE_LABELS[range]}
            </h2>
            <CollectionsChart
              series={data.series}
              userId={Number(userId)}
              range={range}
            />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Methods</h2>
            <MethodPie breakdown={data.method_breakdown} />
          </div>
        </div>
      )}

      {/* Best/worst — week+ */}
      {!isDay && (data.best_day || data.worst_day) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.best_day && (
            <DayCallout
              label="Best day"
              date={data.best_day.date}
              amount={data.best_day.amount}
              count={data.best_day.count}
              tone="emerald"
              userId={Number(userId)}
            />
          )}
          {data.worst_day && (
            <DayCallout
              label="Lowest active day"
              date={data.worst_day.date}
              amount={data.worst_day.amount}
              count={data.worst_day.count}
              tone="amber"
              userId={Number(userId)}
            />
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top customers */}
        <section className="rounded-xl border bg-card lg:col-span-2">
          <header className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Top customers</h2>
            <p className="text-xs text-muted-foreground">
              By amount collected — {RANGE_LABELS[range]}
            </p>
          </header>
          {data.top_customers.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No payments collected from any customer in this period yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left">Customer</th>
                  <th className="px-5 py-2 text-right">Visits</th>
                  <th className="px-5 py-2 text-right">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.top_customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-muted/20">
                    <td className="px-5 py-2.5">
                      {c.customer ? (
                        <Link
                          href={`/customers/${c.customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.customer.full_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {c.customer?.code && (
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {c.customer.code}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                      {c.visits}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold">
                      {FORMAT_MONEY(c.collected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Handovers */}
        <section className="rounded-xl border bg-card">
          <header className="flex items-center justify-between border-b px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold">Handovers</h2>
              <p className="text-xs text-muted-foreground">
                {data.handovers.summary.count} total ·{" "}
                {data.handovers.summary.disputed} disputed
              </p>
            </div>
            <Banknote className="size-4 text-muted-foreground" />
          </header>
          {data.handovers.recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-muted-foreground">
              No cash handovers in this period.
            </div>
          ) : (
            <ul className="divide-y">
              {data.handovers.recent.map((h) => (
                <li key={h.id} className="px-5 py-2.5">
                  <Link
                    href={`/cash-handovers/${h.id}`}
                    className="flex items-center justify-between hover:bg-muted/20"
                  >
                    <div>
                      <p className="text-sm">
                        <span className="font-mono tabular-nums font-semibold">
                          {FORMAT_MONEY(h.amount)}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {h.handed_over_at
                          ? new Date(h.handed_over_at).toLocaleString([], {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset capitalize ${
                        h.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : h.status === "disputed"
                            ? "bg-rose-50 text-rose-700 ring-rose-600/20"
                            : "bg-amber-50 text-amber-700 ring-amber-600/20"
                      }`}
                    >
                      {h.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Activity timeline (day-only) */}
      {isDay && (
        <section className="rounded-xl border bg-card">
          <header className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Activity timeline</h2>
            <p className="text-xs text-muted-foreground">
              Every action {RANGE_LABELS[range].toLowerCase()}, newest first.
            </p>
          </header>
          <ActivityTimeline entries={data.timeline} />
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "emerald" | "rose";
}) {
  const colors =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "rose"
        ? "text-rose-700 dark:text-rose-400"
        : "";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className={`size-3.5 ${colors}`} />
        {label}
      </div>
      <p
        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${colors}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function DayCallout({
  label,
  date,
  amount,
  count,
  tone,
  userId,
}: {
  label: string;
  date: string;
  amount: number;
  count: number;
  tone: "emerald" | "amber";
  userId: number;
}) {
  const tones = {
    emerald:
      "border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
    amber:
      "border-amber-300 bg-amber-50/60 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  };
  return (
    <Link
      href={`/collectors/${userId}?range=today&date=${date}`}
      className={`flex items-center justify-between rounded-xl border p-4 transition-opacity hover:opacity-90 ${tones[tone]}`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {new Date(date).toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <p className="mt-1 text-xs opacity-70">
          {count} payment{count === 1 ? "" : "s"}
        </p>
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums">
        {FORMAT_MONEY(amount)}
      </p>
    </Link>
  );
}
