import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { LocalDateTime } from "@/components/ui/local-datetime";
import { getTenantDetail } from "@/lib/super-admin";
import { TenantActions } from "./tenant-actions";

export const metadata: Metadata = { title: "Tenant · Super-admin" };

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

const STATUS_STYLES: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700 ring-amber-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  suspended: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let tenant;
  try {
    tenant = await getTenantDetail(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          All tenants
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Building2 className="size-6 text-primary" />
              {tenant.name}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {tenant.slug} · {tenant.id}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset capitalize ${
              STATUS_STYLES[tenant.status] ?? ""
            }`}
          >
            {tenant.status}
          </span>
        </div>
      </div>

      <TenantActions
        id={tenant.id}
        status={tenant.status}
        name={tenant.name}
        plan={tenant.plan}
        billingPeriod={tenant.billing_period}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Plan" value={`${tenant.plan} (${tenant.billing_period})`} />
        <Card
          label="MRR"
          value={
            tenant.status === "active" && tenant.plan_price
              ? FORMAT_MONEY(tenant.plan_price)
              : "—"
          }
        />
        <Card label="Users" value={String(tenant.stats.users)} />
        <Card label="Customers" value={String(tenant.stats.customers)} />
        <Card
          label="Unpaid invoices"
          value={String(tenant.stats.unpaid_invoices)}
        />
        <Card
          label="Collected (30d)"
          value={FORMAT_MONEY(tenant.stats.collected_30d)}
        />
        <Card
          label="Trial ends"
          value={
            tenant.trial_ends_at ? (
              <LocalDateTime iso={tenant.trial_ends_at} mode="date" />
            ) : (
              "—"
            )
          }
        />
        <Card
          label="Created"
          value={
            tenant.created_at ? (
              <LocalDateTime iso={tenant.created_at} mode="date" />
            ) : (
              "—"
            )
          }
        />
      </div>

      <section className="rounded-xl border bg-card">
        <header className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold">
            Users in this tenant ({tenant.users.length})
          </h2>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-2 text-left">Name</th>
              <th className="px-5 py-2 text-left">Email</th>
              <th className="px-5 py-2 text-left">Roles</th>
              <th className="px-5 py-2 text-left">Last login</th>
              <th className="px-5 py-2 text-left">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenant.users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/20">
                <td className="px-5 py-2.5 font-medium">{u.name}</td>
                <td className="px-5 py-2.5 text-muted-foreground">
                  {u.email}
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-2.5 text-xs text-muted-foreground">
                  {u.last_login_at ? (
                    <LocalDateTime iso={u.last_login_at} mode="date" />
                  ) : (
                    "Never"
                  )}
                </td>
                <td className="px-5 py-2.5">
                  {u.is_active ? (
                    <span className="text-emerald-600">●</span>
                  ) : (
                    <span className="text-zinc-400">●</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
