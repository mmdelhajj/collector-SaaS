import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileClock, Globe } from "lucide-react";
import { listAudit } from "@/lib/audit";
import { DataPagination } from "@/components/data-pagination";

export const metadata: Metadata = { title: "Audit log · Settings" };

const ACTION_STYLES: Record<string, string> = {
  payment: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  user: "bg-sky-50 text-sky-700 ring-sky-600/20",
  customer: "bg-amber-50 text-amber-700 ring-amber-600/20",
  radius: "bg-violet-50 text-violet-700 ring-violet-600/20",
  invoice: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

function styleFor(action: string): string {
  const prefix = action.split(".")[0];
  return ACTION_STYLES[prefix] ?? "bg-zinc-100 text-zinc-700 ring-zinc-600/20";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const data = await listAudit({
    page,
    perPage: 50,
    search: params.search,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileClock className="size-6 text-primary" />
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every meaningful action — payments, role changes, customer deletions,
          RADIUS suspends — with who did it, when, and from where.
        </p>
      </div>

      <form className="flex gap-2" action="/settings/audit">
        <input
          type="search"
          name="search"
          defaultValue={params.search ?? ""}
          placeholder="Filter by action or subject…"
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">Who</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">From</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No audit entries match this filter.
                </td>
              </tr>
            ) : (
              data.data.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 align-top text-xs text-muted-foreground">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="font-medium">
                      {row.user?.name ?? "System"}
                    </div>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ring-1 ring-inset ${styleFor(
                        row.action,
                      )}`}
                    >
                      {row.action}
                    </span>
                    {row.changes && (
                      <details className="mt-1 text-[11px]">
                        <summary className="cursor-pointer text-muted-foreground">
                          changes
                        </summary>
                        <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-muted/40 p-2 font-mono text-[10px]">
                          {JSON.stringify(row.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {row.subject_label ? (
                      <div>
                        <div className="font-medium">{row.subject_label}</div>
                        {row.subject_type && (
                          <div className="text-xs text-muted-foreground">
                            {row.subject_type}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-muted-foreground">
                    {row.ip_address ? (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="size-3" />
                        <code className="font-mono">{row.ip_address}</code>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DataPagination
        currentPage={data.meta.current_page}
        lastPage={data.meta.last_page}
        from={data.meta.from}
        to={data.meta.to}
        total={data.meta.total}
        unit="entries"
      />
    </div>
  );
}
