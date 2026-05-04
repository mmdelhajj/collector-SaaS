import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Download, ExternalLink } from "lucide-react";
import { listInvoices, type InvoiceStatus } from "@/lib/invoices";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { InvoicesFilters } from "@/components/invoices/invoices-filters";
import { BulkBillingButton } from "@/components/invoices/bulk-billing-button";
import { InvoicesSelectableTable } from "@/components/invoices/invoices-selectable-table";
import { DataPagination } from "@/components/data-pagination";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Invoices" };

type SearchParams = Promise<{
  page?: string;
  search?: string;
  status?: string;
}>;

const PER_PAGE = 25;
const VALID_STATUSES: readonly string[] = [
  "draft", "open", "paid", "partial", "overdue", "cancelled", "void",
];

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const search = sp.search?.trim() || undefined;
  let overdueOnly = false;
  let status: InvoiceStatus | undefined;
  if (sp.status === "overdue") {
    overdueOnly = true;
  } else if (sp.status && VALID_STATUSES.includes(sp.status)) {
    status = sp.status as InvoiceStatus;
  }

  let list: Awaited<ReturnType<typeof listInvoices>>;
  try {
    list = await listInvoices({
      page,
      perPage: PER_PAGE,
      search,
      status,
      overdueOnly,
    });
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

  const totals = list.data.reduce(
    (acc, inv) => {
      acc.total += inv.total;
      acc.outstanding += inv.balance_due;
      return acc;
    },
    { total: 0, outstanding: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Billing for the current and prior periods. Run monthly billing to
            generate this month&rsquo;s invoices for every active subscription.
          </p>
        </div>
        <BulkBillingButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="On this page"
          value={list.data.length.toString()}
          hint={`of ${list.meta.total} total`}
        />
        <SummaryCard
          label="Page total"
          value={formatMoney(totals.total)}
          hint="all invoices on this page"
        />
        <SummaryCard
          label="Page outstanding"
          value={formatMoney(totals.outstanding)}
          hint="unpaid balance on this page"
          accent={totals.outstanding > 0}
        />
      </div>

      <InvoicesFilters />

      <InvoicesSelectableTable invoices={list.data} />

      <DataPagination
        currentPage={list.meta.current_page}
        lastPage={list.meta.last_page}
        from={list.meta.from}
        to={list.meta.to}
        total={list.meta.total}
        unit="invoices"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${
          accent ? "text-foreground" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
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
              a tenant) to view invoices.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in as a tenant admin
                <ExternalLink className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
