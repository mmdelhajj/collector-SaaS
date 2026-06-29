import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Coins,
  FileText,
  KeyRound,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { StatCard } from "@/components/dashboard/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentUser, isCollectorOnly } from "@/lib/auth";
import { getDashboardReport, type DashboardReport } from "@/lib/reports";

export const metadata: Metadata = { title: "Dashboard" };

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const ACTION_META: Record<
  string,
  { icon: LucideIcon; color: string; label: string }
> = {
  "payment.created": {
    icon: CheckCircle2,
    color: "text-emerald-600",
    label: "Payment received",
  },
  "user.role_changed": {
    icon: UserCog,
    color: "text-sky-600",
    label: "Role changed",
  },
  "user.deactivated": {
    icon: UserCog,
    color: "text-rose-600",
    label: "User deactivated",
  },
  "user.reactivated": {
    icon: UserCog,
    color: "text-emerald-600",
    label: "User reactivated",
  },
  "user.password_reset": {
    icon: KeyRound,
    color: "text-amber-600",
    label: "Password reset",
  },
  "user.2fa_enabled": {
    icon: ShieldCheck,
    color: "text-emerald-600",
    label: "2FA enabled",
  },
  "user.2fa_disabled": {
    icon: ShieldAlert,
    color: "text-amber-600",
    label: "2FA disabled",
  },
  "customer.deleted": {
    icon: Trash2,
    color: "text-rose-600",
    label: "Customer deleted",
  },
  "radius.suspended": {
    icon: ShieldAlert,
    color: "text-amber-600",
    label: "Service suspended",
  },
  "radius.reactivated": {
    icon: ShieldCheck,
    color: "text-emerald-600",
    label: "Service reactivated",
  },
  "role.permissions_updated": {
    icon: UserCog,
    color: "text-sky-600",
    label: "Role permissions updated",
  },
  "tenant.currency_changed": {
    icon: Coins,
    color: "text-sky-600",
    label: "Currency settings changed",
  },
  "tenant.exchange_rate_updated": {
    icon: Coins,
    color: "text-sky-600",
    label: "Exchange rate updated",
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function activityDetail(
  action: string,
  label: string | null,
  changes: Record<string, unknown> | null,
): string {
  if (action === "payment.created" && changes) {
    const amount = changes.amount;
    const method = changes.method;
    const currency = changes.currency ?? "USD";
    return `${label ?? ""}${amount ? ` · $${amount} ${currency}` : ""}${method ? ` · ${method}` : ""}`.trim();
  }
  if (action === "user.role_changed" && changes) {
    return `${label ?? ""} → ${changes.new ?? ""} (was ${changes.old ?? "?"})`;
  }
  if (action === "tenant.currency_changed" && changes) {
    const o = changes.old as
      | { primary?: string; secondary?: string | null }
      | undefined;
    const n = changes.new as
      | { primary?: string; secondary?: string | null }
      | undefined;
    const oldPair = `${o?.primary ?? "?"}/${o?.secondary ?? "—"}`;
    const newPair = `${n?.primary ?? "?"}/${n?.secondary ?? "—"}`;
    return `${oldPair} → ${newPair}`;
  }
  if (action === "tenant.exchange_rate_updated" && changes) {
    const oldRate = changes.old;
    const newRate = changes.new;
    const src = changes.source ? ` (${changes.source})` : "";
    if (oldRate == null) return `set to ${newRate}${src}`;
    return `${oldRate} → ${newRate}${src}`;
  }
  return label ?? "";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (isCollectorOnly(user)) redirect("/my-route");
  const firstName = user?.name.split(" ")[0] ?? "there";
  const report = await getDashboardReport();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s how things look right now.
        </p>
      </div>

      {/* The 4 numbers that answer "am I OK?" — each with a comparison. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active customers"
          value={report.active_customers.toLocaleString()}
          hint={
            report.suspended_customers > 0
              ? `${report.suspended_customers} suspended`
              : "all in good standing"
          }
          icon={Users}
        />
        <StatCard
          label="Collected today"
          value={FORMAT_MONEY(report.collected_today)}
          delta={
            report.mom_change_pct != null
              ? {
                  value: `${report.mom_change_pct > 0 ? "+" : ""}${report.mom_change_pct}%`,
                  trend: report.mom_change_pct >= 0 ? "up" : "down",
                }
              : undefined
          }
          hint={`${FORMAT_MONEY(report.collected_this_month)} this month`}
          icon={Wallet}
        />
        <StatCard
          label="Open invoices"
          value={report.open_invoices.toLocaleString()}
          hint={`${FORMAT_MONEY(report.total_outstanding)} outstanding`}
          icon={FileText}
        />
        <StatCard
          label="Overdue 30d+"
          value={report.overdue_30_plus.toLocaleString()}
          hint={
            report.overdue_outstanding > 0
              ? `${FORMAT_MONEY(report.overdue_outstanding)} chasing`
              : "all current"
          }
          icon={AlertCircle}
        />
      </div>

      {/* The heart of the dashboard: plain-language things to act on. */}
      <NeedsAttention report={report} />

      {/* Collectors today */}
      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" />
            Collectors today
          </h2>
          <Link
            href="/collectors"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            All collectors
            <ArrowRight className="size-3" />
          </Link>
        </header>
        {report.collectors_today.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No collector activity today yet. Assign some invoices on{" "}
            <Link href="/invoices" className="text-primary hover:underline">
              /invoices
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y">
            {report.collectors_today.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/collectors/${c.id}?range=today`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <Avatar className="size-9 border">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {c.name
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {c.name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                          c.status === "done"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : c.status === "on-route"
                              ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                              : "bg-zinc-100 text-zinc-600 ring-zinc-600/20"
                        }`}
                      >
                        {c.status === "done"
                          ? "Done"
                          : c.status === "on-route"
                            ? "On route"
                            : "Not started"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {c.completed}/{c.total}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <Banknote className="me-1 inline size-3 text-emerald-600" />
                      <span className="font-mono tabular-nums">
                        {FORMAT_MONEY(c.collected_today)}
                      </span>{" "}
                      collected
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          href="/invoices?status=overdue"
          icon={AlertCircle}
          label="Overdue invoices"
          tone="rose"
        />
        <QuickLink
          href="/customers"
          icon={UserPlus}
          label="Add a customer"
          tone="primary"
        />
        <QuickLink
          href="/cash-handovers?status=pending"
          icon={Banknote}
          label="Pending cash drops"
          tone="amber"
        />
        <QuickLink
          href="/reports"
          icon={FileText}
          label="Open reports"
          tone="primary"
        />
      </div>

      {/* Recent activity — demoted below the fold; the boss doesn't run the
          business off an audit log. */}
      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Recent activity
          </h2>
          <Link
            href="/settings/audit"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Full log
            <ArrowRight className="size-3" />
          </Link>
        </header>
        {report.recent_activity.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-muted-foreground">
            Nothing yet. Audit entries appear here as soon as someone records a
            payment, changes a role, or suspends a service.
          </div>
        ) : (
          <ul className="divide-y">
            {report.recent_activity.slice(0, 6).map((a) => {
              const meta = ACTION_META[a.action] ?? {
                icon: CheckCircle2,
                color: "text-zinc-500",
                label: a.action,
              };
              const Icon = meta.icon;
              return (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{meta.label}</p>
                    {(() => {
                      const det = activityDetail(
                        a.action,
                        a.subject_label,
                        a.changes,
                      );
                      return det ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {det}
                        </p>
                      ) : null;
                    })()}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {a.user_name ? `${a.user_name} · ` : ""}
                      {timeAgo(a.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Plain-language "do this now" list, built from numbers already in the
 *  dashboard report — no extra API calls. Each row is one sentence + one
 *  button. When nothing needs doing, shows a reassuring all-clear card. */
function NeedsAttention({ report }: { report: DashboardReport }) {
  const items: {
    key: string;
    icon: LucideIcon;
    tone: "rose" | "amber";
    text: string;
    action: string;
    href: string;
  }[] = [];

  if (report.overdue_30_plus > 0) {
    items.push({
      key: "overdue",
      icon: AlertCircle,
      tone: "rose",
      text: `${report.overdue_30_plus} ${report.overdue_30_plus === 1 ? "invoice" : "invoices"} overdue 30 days+ · ${FORMAT_MONEY(report.overdue_outstanding)} to chase`,
      action: "Send reminder",
      href: "/invoices?status=overdue",
    });
  }
  if (report.suspended_customers > 0) {
    items.push({
      key: "suspended",
      icon: ShieldAlert,
      tone: "amber",
      text: `${report.suspended_customers} ${report.suspended_customers === 1 ? "customer" : "customers"} suspended`,
      action: "Review",
      href: "/customers?status=suspended",
    });
  }

  const toneRow = {
    rose: "border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20",
    amber:
      "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
  } as const;
  const toneIcon = {
    rose: "text-rose-600",
    amber: "text-amber-600",
  } as const;
  const toneBtn = {
    rose: "bg-rose-600 hover:bg-rose-700",
    amber: "bg-amber-600 hover:bg-amber-700",
  } as const;

  return (
    <section className="rounded-xl border bg-card">
      <header className="border-b px-5 py-3">
        <h2 className="text-sm font-semibold">Needs your attention</h2>
      </header>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
          <CheckCircle2 className="size-5 text-emerald-600" />
          You&apos;re all caught up — nothing needs action right now.
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li
                key={it.key}
                className={`flex flex-wrap items-center gap-3 border-l-4 px-5 py-4 ${toneRow[it.tone]}`}
              >
                <Icon className={`size-5 shrink-0 ${toneIcon[it.tone]}`} />
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {it.text}
                </span>
                <Link
                  href={it.href}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${toneBtn[it.tone]}`}
                >
                  {it.action}
                  <ArrowRight className="size-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone: "primary" | "rose" | "amber";
}) {
  const tones = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    rose: "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30",
    amber: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30",
  };
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors hover:opacity-90 ${tones[tone]}`}
    >
      <Icon className="size-5" />
      <span className="text-sm font-semibold">{label}</span>
      <ArrowRight className="ms-auto size-4 opacity-60" />
    </Link>
  );
}
