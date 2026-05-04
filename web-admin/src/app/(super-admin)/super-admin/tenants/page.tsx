import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import { listAllTenants } from "@/lib/super-admin";

export const metadata: Metadata = { title: "Tenants · Super-admin" };

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

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const { tenants, total } = await listAllTenants({
    search: sp.search,
    status: sp.status,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="size-6 text-primary" />
            Tenants
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} total — every workspace on the platform.
          </p>
        </div>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="size-4" />
          New tenant
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <form className="flex flex-1 gap-2" action="/super-admin/tenants">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="search"
              defaultValue={sp.search ?? ""}
              placeholder="Search by name or slug…"
              className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Search
          </button>
        </form>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {[
            { key: "", label: "All" },
            { key: "trial", label: "Trial" },
            { key: "active", label: "Paying" },
            { key: "suspended", label: "Suspended" },
          ].map((t) => {
            const isActive = (sp.status ?? "") === t.key;
            const url = new URLSearchParams();
            if (sp.search) url.set("search", sp.search);
            if (t.key) url.set("status", t.key);
            return (
              <Link
                key={t.key}
                href={`/super-admin/tenants${url.toString() ? "?" + url : ""}`}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Tenant</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Users</th>
              <th className="px-4 py-3 text-right">Customers</th>
              <th className="px-4 py-3 text-right">MRR</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No tenants match.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link
                      href={`/super-admin/tenants/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.name}
                    </Link>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {t.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset capitalize ${
                        STATUS_STYLES[t.status] ?? ""
                      }`}
                    >
                      {t.status}
                    </span>
                    {t.status === "trial" && t.trial_ends_at && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        ends{" "}
                        {new Date(t.trial_ends_at).toLocaleDateString(
                          undefined,
                          {
                            day: "2-digit",
                            month: "short",
                          },
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {t.users_count}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {t.customers_count}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {t.status === "active" && t.plan_price
                      ? FORMAT_MONEY(t.plan_price)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/super-admin/tenants/${t.id}`}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
