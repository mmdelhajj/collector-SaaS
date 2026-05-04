import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { listTickets } from "@/lib/tickets";
import type { TicketStatus } from "@/lib/tickets-types";
import { TicketsTable } from "./tickets-table";
import { NewTicketSheet } from "./new-ticket-sheet";
import { DataPagination } from "@/components/data-pagination";

export const metadata: Metadata = { title: "Tickets" };

const STATUS_TABS: Array<{ key: TicketStatus | "all"; label: string }> = [
  { key: "open", label: "Open" },
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "all", label: "All" },
];

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: TicketStatus;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const status = params.status;

  const data = await listTickets({
    page,
    perPage: 25,
    search: params.search,
    status: status === ("all" as TicketStatus) ? undefined : (status ?? "open"),
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Wrench className="size-6 text-primary" />
            Tickets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Installations, repairs, disconnections, and customer support
            requests.
          </p>
        </div>
        <NewTicketSheet />
      </div>

      <div className="flex gap-1 rounded-lg border bg-card p-1">
        {STATUS_TABS.map((t) => {
          const isActive = (params.status ?? "open") === t.key;
          return (
            <a
              key={t.key}
              href={
                t.key === "all"
                  ? "/tickets?status=all"
                  : `/tickets?status=${t.key}`
              }
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

      <TicketsTable rows={data.data} />

      <DataPagination
        currentPage={data.meta.current_page}
        lastPage={data.meta.last_page}
        from={data.meta.from}
        to={data.meta.to}
        total={data.meta.total}
        unit="tickets"
      />
    </div>
  );
}
