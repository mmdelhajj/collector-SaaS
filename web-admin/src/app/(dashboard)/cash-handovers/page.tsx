import type { Metadata } from "next";
import { Banknote } from "lucide-react";
import { listHandovers, type HandoverStatus } from "@/lib/handovers";
import { HandoversTable } from "./handovers-table";
import { DataPagination } from "@/components/data-pagination";

export const metadata: Metadata = { title: "Cash handovers" };

const STATUS_TABS: Array<{ key: HandoverStatus | "all"; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "disputed", label: "Disputed" },
  { key: "all", label: "All" },
];

export default async function HandoversPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: HandoverStatus }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const status = params.status ?? "pending";

  const data = await listHandovers({
    page,
    perPage: 25,
    status: status === ("all" as HandoverStatus) ? undefined : status,
  });

  const pendingCount = data.data.filter((h) => h.status === "pending").length;
  const total = data.data.reduce((sum, h) => sum + Number(h.amount || 0), 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Banknote className="size-6 text-primary" />
          Cash handovers
        </h1>
        <p className="text-sm text-muted-foreground">
          Collectors submit physical cash + mobile-money bundles (Whish, OMT,
          Areeba) here. Card &amp; bank transfers go directly to the company
          account and don&rsquo;t need handover. Each pending submission shows
          what the collector declared vs the system total — confirm if it
          matches, or flag a discrepancy.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {STATUS_TABS.map((t) => {
            const isActive = (params.status ?? "pending") === t.key;
            const href =
              t.key === "all"
                ? "/cash-handovers?status=all"
                : `/cash-handovers?status=${t.key}`;
            return (
              <a
                key={t.key}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </a>
            );
          })}
        </div>
        {pendingCount > 0 && status === "pending" && (
          <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400">
            {pendingCount} pending · ${total.toLocaleString()} awaiting
            confirmation
          </div>
        )}
      </div>

      <HandoversTable rows={data.data} />

      <DataPagination
        currentPage={data.meta.current_page}
        lastPage={data.meta.last_page}
        from={data.meta.from}
        to={data.meta.to}
        total={data.meta.total}
        unit="handovers"
      />
    </div>
  );
}
