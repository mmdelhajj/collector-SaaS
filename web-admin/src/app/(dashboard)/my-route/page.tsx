import type { Metadata } from "next";
import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Phone,
  Receipt,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  listMyAssignments,
  getMyStats,
  listMyPayments,
  getPendingCash,
  listSupervisors,
  type MyPayment,
} from "@/lib/collector-self";
import { HandoverSheet } from "./handover-sheet";
import { ServiceCategoryBadge } from "@/components/service-category-badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My route" };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
  failed:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
  reassigned: "bg-zinc-100 text-zinc-500 ring-zinc-600/20",
};

export default async function MyRoutePage() {
  // /my-route is the field-collector working surface only. Admins/managers
  // who land here (e.g. via a stale bookmark) get bounced to /dashboard so
  // they're not stuck on a page that just shows their personal cash tally.
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.roles.includes("collector")) redirect("/dashboard");
  const [assignments, stats, payments, pendingCash, supervisors] =
    await Promise.all([
      listMyAssignments(),
      getMyStats(),
      listMyPayments(),
      getPendingCash(),
      listSupervisors().catch(() => []),
    ]);

  const pending = assignments.filter(
    (a) => a.status === "pending" || a.status === "in_progress",
  );
  const completed = assignments.filter((a) => a.status === "completed");
  const failed = assignments.filter((a) => a.status === "failed");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MapPin className="size-6 text-primary" />
          Hi {me.name.split(" ")[0]}, here&rsquo;s your route
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a customer to navigate, call, or record a payment.
        </p>
      </div>

      <HandoverSheet pending={pendingCash} supervisors={supervisors} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Today"
          collected={stats.today.collected}
          completed={stats.today.assignments?.completed ?? 0}
          total={
            (stats.today.assignments?.completed ?? 0) +
            (stats.today.assignments?.pending ?? 0) +
            (stats.today.assignments?.in_progress ?? 0) +
            (stats.today.assignments?.failed ?? 0)
          }
        />
        <StatCard
          label="This week"
          collected={stats.this_week.collected}
          completed={stats.this_week.assignments?.completed ?? 0}
          total={Object.values(stats.this_week.assignments ?? {}).reduce(
            (a, b) => a + b,
            0,
          )}
        />
        <StatCard
          label="This month"
          collected={stats.this_month.collected}
          completed={stats.this_month.assignments?.completed ?? 0}
          total={Object.values(stats.this_month.assignments ?? {}).reduce(
            (a, b) => a + b,
            0,
          )}
        />
      </div>

      {payments.rows.length > 0 && (
        <Section
          title={`Today's collections (${payments.rows.length})`}
          icon={Receipt}
          iconClass="text-emerald-600"
        >
          <PaymentsList rows={payments.rows} totals={payments.totals} />
        </Section>
      )}

      <Section
        title={`To do (${pending.length})`}
        icon={ClipboardList}
        iconClass="text-amber-600"
      >
        {pending.length === 0 ? (
          <Empty msg="No pending stops 🎉 Either nothing assigned today or you've cleared the list." />
        ) : (
          <Stops rows={pending} actionable />
        )}
      </Section>

      {completed.length > 0 && (
        <Section
          title={`Completed (${completed.length})`}
          icon={CheckCircle2}
          iconClass="text-emerald-600"
        >
          <Stops rows={completed} />
        </Section>
      )}

      {failed.length > 0 && (
        <Section
          title={`Couldn't collect (${failed.length})`}
          icon={XCircle}
          iconClass="text-rose-600"
        >
          <Stops rows={failed} />
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className={cn("size-4", iconClass)} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({
  label,
  collected,
  completed,
  total,
}: {
  label: string;
  collected: number;
  completed: number;
  total: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
        ${collected.toFixed(2)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {completed} of {total} stops
      </p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {msg}
    </div>
  );
}

import { CollectorAssignment } from "@/lib/collectors-types";

function Stops({
  rows,
  actionable,
}: {
  rows: CollectorAssignment[];
  actionable?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card divide-y">
      {rows.map((a) => {
        const cust = a.invoice?.customer;
        return (
          <div
            key={a.id}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {cust?.full_name ?? "Customer"}
                </span>
                {cust?.code && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {cust.code}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                    STATUS_STYLES[a.status],
                  )}
                >
                  {a.status.replace("_", " ")}
                </span>
              </div>
              {cust?.address_line && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {cust.city ? `${cust.city} · ` : ""}
                  {cust.address_line}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <ServiceCategoryBadge
                  name={a.invoice?.service_category?.name}
                />
                <span className="font-mono tabular-nums">
                  <Banknote className="me-1 inline size-3 text-emerald-600" />$
                  {(a.invoice?.balance_due ?? 0).toFixed(2)}
                </span>
                {a.invoice?.due_at && (
                  <span className="text-muted-foreground">
                    <Clock className="me-1 inline size-3" />
                    Due {new Date(a.invoice.due_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-shrink-0 gap-2">
              {cust?.phone_primary && (
                <a
                  href={`tel:${cust.phone_primary}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted"
                >
                  <Phone className="size-3.5" />
                  Call
                </a>
              )}
              {cust?.latitude != null && cust?.longitude != null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${cust.latitude},${cust.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted"
                >
                  <MapPin className="size-3.5" />
                  Navigate
                </a>
              )}
              {actionable && (
                <a
                  href={`/my-route/record/${a.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <Banknote className="size-3.5" />
                  Record
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  whish: "Whish",
  omt: "OMT",
  areeba: "Areeba",
  bank_transfer: "Bank",
  card: "Card",
  stripe: "Stripe",
  other: "Other",
};

function PaymentsList({
  rows,
  totals,
}: {
  rows: MyPayment[];
  totals: { in_hand: number; direct: number; all: number };
}) {
  return (
    <div className="space-y-3">
      {/* Split totals up top — collector sees at a glance what they carry */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            📥 In your hands
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-900 dark:text-amber-200">
            ${totals.in_hand.toFixed(2)}
          </p>
          <p className="text-[10px] text-amber-800/80 dark:text-amber-300/70">
            Cash you carry — needs handover
          </p>
        </div>
        <div className="rounded-xl border border-sky-300 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-300">
            🏢 → Company wallet
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-sky-900 dark:text-sky-200">
            ${totals.direct.toFixed(2)}
          </p>
          <p className="text-[10px] text-sky-800/80 dark:text-sky-300/70">
            Whish / OMT / card — already with company
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            🟢 Total today
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            ${totals.all.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {rows.length} payment{rows.length === 1 ? "" : "s"} from{" "}
            {new Set(rows.map((r) => r.customer?.id).filter(Boolean)).size}{" "}
            customer{rows.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Per-payment list with routing badge */}
      <div className="overflow-hidden rounded-xl border bg-card divide-y">
        {rows.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 sm:p-4">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
                p.routing === "in_hand"
                  ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/40 dark:text-sky-400"
              }`}
              title={
                p.routing === "in_hand"
                  ? "In your hands — needs handover"
                  : "Sent direct to company wallet"
              }
            >
              {p.routing === "in_hand" ? "📥" : "🏢"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">
                {p.customer?.full_name ?? "—"}
                {p.customer?.code && (
                  <span className="ms-2 font-mono text-[11px] font-normal text-muted-foreground">
                    {p.customer.code}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {p.invoice && (
                  <span className="font-mono">{p.invoice.number}</span>
                )}
                <span>·</span>
                <span className="font-medium">
                  {METHOD_LABELS[p.method] ?? p.method}
                </span>
                <span
                  className={
                    p.routing === "in_hand"
                      ? "rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      : "rounded bg-sky-100 px-1.5 py-px text-[10px] font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                  }
                >
                  {p.routing === "in_hand" ? "with you" : "→ company"}
                </span>
                {p.handed_over && (
                  <span className="rounded bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ✓ handed over
                  </span>
                )}
                {p.collected_at && (
                  <>
                    <span>·</span>
                    <span>
                      {new Date(p.collected_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                )}
                {p.reference_number && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{p.reference_number}</span>
                  </>
                )}
              </div>
              {p.notes && (
                <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                  &ldquo;{p.notes}&rdquo;
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p
                className={`font-mono tabular-nums text-sm font-semibold ${
                  p.routing === "in_hand"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-sky-700 dark:text-sky-400"
                }`}
              >
                ${p.amount.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">{p.currency}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
