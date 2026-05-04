import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Gauge, Radio, Wifi } from "lucide-react";
import { listRadiusUsers, type RadiusStatus } from "@/lib/radius";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { RadiusStatusBadge } from "@/components/radius/radius-status-badge";
import { RadiusRowActions } from "@/components/radius/radius-row-actions";
import { DataPagination } from "@/components/data-pagination";
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

export const metadata: Metadata = { title: "RADIUS" };

type SearchParams = Promise<{
  page?: string;
  search?: string;
  status?: string;
}>;

const PER_PAGE = 25;
const VALID_STATUSES: readonly string[] = [
  "active",
  "suspended",
  "throttled",
  "terminated",
];

function formatBytes(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function relTime(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function RadiusPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const search = sp.search?.trim() || undefined;
  const status =
    sp.status && VALID_STATUSES.includes(sp.status)
      ? (sp.status as RadiusStatus)
      : undefined;

  let list: Awaited<ReturnType<typeof listRadiusUsers>>;
  try {
    list = await listRadiusUsers({ page, perPage: PER_PAGE, search, status });
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

  // Online = last_seen_at within the last 5 minutes.
  const now = Date.now();
  const onlineCount = list.data.filter((u) =>
    u.last_seen_at
      ? now - new Date(u.last_seen_at).getTime() < 5 * 60 * 1000
      : false,
  ).length;

  const totalDataMb = list.data.reduce(
    (s, u) => s + u.data_used_mb_current_period,
    0,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RADIUS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internet subscribers tied to your FreeRADIUS server. Suspend a user
          and a CoA Disconnect-Request fires immediately so their session
          terminates without waiting for the next reauth.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Subscribers"
          value={list.meta.total.toString()}
          icon={Radio}
        />
        <SummaryCard
          label="Online (5 min)"
          value={onlineCount.toString()}
          icon={Wifi}
          accent
          hint={`${list.data.length} on this page`}
        />
        <SummaryCard
          label="Suspended"
          value={list.data.filter((u) => u.status === "suspended").length.toString()}
          icon={Radio}
          hint="on this page"
        />
        <SummaryCard
          label="Data this period"
          value={formatBytes(totalDataMb)}
          icon={Gauge}
          hint="across this page"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip href="/radius" label="All" active={!status} />
        {(["active", "suspended", "throttled", "terminated"] as const).map(
          (s) => (
            <FilterChip
              key={s}
              href={`/radius?status=${s}`}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              active={status === s}
            />
          ),
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Username</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden lg:table-cell">Group</TableHead>
              <TableHead className="hidden xl:table-cell">IP</TableHead>
              <TableHead className="hidden md:table-cell">Last seen</TableHead>
              <TableHead className="text-right">Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <span className="text-sm text-muted-foreground">
                    No RADIUS subscribers match your filters.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {u.username}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.customer?.full_name ?? "—"}
                      </p>
                      {u.customer?.code && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {u.customer.code}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">
                      {u.radius_group ?? "default"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
                    {u.last_login_ip ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {relTime(u.last_seen_at)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {formatBytes(u.data_used_mb_current_period)}
                  </TableCell>
                  <TableCell>
                    <RadiusStatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RadiusRowActions
                      id={u.id}
                      status={u.status}
                      username={u.username}
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
          unit="subscribers"
        />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  hint,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
          accent && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
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
              <span className="font-mono text-foreground">{email}</span> needs
              a tenant) to view RADIUS users.
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
