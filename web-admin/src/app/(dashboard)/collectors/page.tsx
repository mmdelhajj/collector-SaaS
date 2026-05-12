import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Banknote, MapPin, Phone, Wallet } from "lucide-react";
import { listAssignments, type AssignmentStatus } from "@/lib/collectors";
import { listHandovers } from "@/lib/handovers";
import { listCollectors } from "@/lib/users";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { AssignmentStatusBadge } from "@/components/collectors/assignment-status-badge";
import { ServiceCategoryBadge } from "@/components/service-category-badge";
import { InviteUserSheet } from "@/components/users/invite-user-sheet";
import { AssignmentRowActions } from "@/components/collectors/assignment-row-actions";
import { HandoverRowActions } from "@/components/collectors/handover-row-actions";
import { DataPagination } from "@/components/data-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Collectors" };

type SearchParams = Promise<{
  page?: string;
  status?: string;
}>;

const PER_PAGE = 50;
const VALID_STATUSES: readonly string[] = [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "reassigned",
];

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default async function CollectorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const status =
    sp.status && VALID_STATUSES.includes(sp.status)
      ? (sp.status as AssignmentStatus)
      : undefined;

  let list: Awaited<ReturnType<typeof listAssignments>>;
  let pendingHandovers: Awaited<ReturnType<typeof listHandovers>>;
  let collectorOptions: Awaited<ReturnType<typeof listCollectors>>;
  try {
    [list, pendingHandovers, collectorOptions] = await Promise.all([
      // No date filter — pending/in-progress assignments stay visible
      // regardless of when they were assigned. Status chips narrow further.
      listAssignments({ page, perPage: PER_PAGE, status }),
      listHandovers({ status: "pending", perPage: 25 }),
      listCollectors(),
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

  // Seed the top section with every active collector in the tenant so the
  // team is always visible — even before anyone has been assigned anything.
  // Assignments below just overlay counts onto these baseline entries.
  const byCollector = new Map<
    number,
    {
      id: number;
      name: string;
      total: number;
      pending: number;
      in_progress: number;
      completed: number;
      failed: number;
      collected: number;
    }
  >();
  for (const u of collectorOptions) {
    byCollector.set(u.id, {
      id: u.id,
      name: u.name,
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      collected: 0,
    });
  }
  for (const a of list.data) {
    if (!a.collector) continue;
    const id = a.collector.id;
    const cur = byCollector.get(id) ?? {
      id,
      name: a.collector.name,
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      collected: 0,
    };
    cur.total++;
    if (a.status === "pending") cur.pending++;
    if (a.status === "in_progress") cur.in_progress++;
    if (a.status === "completed") {
      cur.completed++;
      cur.collected += a.invoice?.total ?? 0;
    }
    if (a.status === "failed") cur.failed++;
    byCollector.set(id, cur);
  }

  const totals = {
    assignments: list.meta.total,
    completed: list.data.filter((a) => a.status === "completed").length,
    in_progress: list.data.filter((a) => a.status === "in_progress").length,
    pending: list.data.filter((a) => a.status === "pending").length,
    collected_today: Array.from(byCollector.values()).reduce(
      (s, c) => s + c.collected,
      0,
    ),
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collectors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Today&rsquo;s field assignments. Mark each one as on-route or done
            as you visit. Hand out invoices from{" "}
            <Link
              href="/invoices"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              the invoices page
            </Link>
            .
          </p>
        </div>
        <InviteUserSheet
          defaultRole="collector"
          triggerLabel="Add collector"
          title="Add a new collector"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Today's assignments"
          value={totals.assignments.toString()}
        />
        <SummaryCard
          label="Completed"
          value={totals.completed.toString()}
          accent
        />
        <SummaryCard label="On route" value={totals.in_progress.toString()} />
        <SummaryCard
          label="Collected today"
          value={formatMoney(totals.collected_today)}
        />
      </div>

      {pendingHandovers.data.length > 0 && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="size-4 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              Cash awaiting your confirmation
            </h2>
            <span className="ms-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              {pendingHandovers.meta.total} pending
            </span>
          </div>
          <div className="space-y-2">
            {pendingHandovers.data.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-4 rounded-lg border bg-card p-3"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                  <Wallet className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(h.amount, h.currency)}{" "}
                    <span className="font-normal text-muted-foreground">
                      from {h.collector?.name ?? "—"}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {h.handed_over_at
                      ? new Intl.DateTimeFormat("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(h.handed_over_at))
                      : "—"}
                    {h.notes && <> · {h.notes}</>}
                  </p>
                </div>
                <HandoverRowActions
                  id={h.id}
                  amount={h.amount}
                  collectorName={h.collector?.name ?? "the collector"}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {byCollector.size > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            On the road today
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(byCollector.values()).map((c) => {
              const progress =
                c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  href={`/collectors/${c.id}?range=today`}
                  className="block rounded-lg border bg-background p-4 transition-colors hover:bg-muted/30 hover:border-primary/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 border">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.completed}/{c.total} done ·{" "}
                        {formatMoney(c.collected)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    {c.pending > 0 && <span>{c.pending} pending</span>}
                    {c.in_progress > 0 && (
                      <span>· {c.in_progress} on route</span>
                    )}
                    {c.failed > 0 && <span>· {c.failed} failed</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip href="/collectors" label="All" active={!status} />
        {(["pending", "in_progress", "completed", "failed"] as const).map(
          (s) => (
            <FilterChip
              key={s}
              href={`/collectors?status=${s}`}
              label={
                s === "in_progress"
                  ? "On route"
                  : s.charAt(0).toUpperCase() + s.slice(1)
              }
              active={status === s}
            />
          ),
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Invoice</TableHead>
              <TableHead className="hidden lg:table-cell">Service</TableHead>
              <TableHead>Collector</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      No assignments for today.
                    </span>
                    <span>
                      Use the bulk-assign API to hand out invoices, or wait for
                      the manager to assign them.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {a.route_order != null ? a.route_order + 1 : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {a.invoice?.customer?.full_name ?? "—"}
                      </p>
                      {a.invoice?.customer?.code && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {a.invoice.customer.code}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5 text-xs">
                      {a.invoice?.customer?.phone_primary && (
                        <span className="inline-flex items-center gap-1 text-foreground/90">
                          <Phone className="size-3 text-muted-foreground" />
                          {a.invoice.customer.phone_primary}
                        </span>
                      )}
                      {a.invoice?.customer?.city && (
                        <div className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3" />
                          {a.invoice.customer.city}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {a.invoice?.number && (
                      <span className="font-mono text-xs">
                        {a.invoice.number}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <ServiceCategoryBadge
                      name={a.invoice?.service_category?.name ?? null}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.collector?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {a.invoice ? formatMoney(a.invoice.balance_due) : "—"}
                  </TableCell>
                  <TableCell>
                    <AssignmentStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AssignmentRowActions
                      id={a.id}
                      currentStatus={a.status}
                      invoiceId={a.invoice?.id}
                      currentCollectorId={a.collector?.id ?? null}
                      collectors={collectorOptions.map((u) => ({
                        id: u.id,
                        name: u.name,
                      }))}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <DataPagination
          currentPage={list.meta.current_page}
          lastPage={list.meta.last_page}
          from={list.meta.from}
          to={list.meta.to}
          total={list.meta.total}
          unit="assignments"
        />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
          accent && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
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
              tenant) to view collectors.
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
