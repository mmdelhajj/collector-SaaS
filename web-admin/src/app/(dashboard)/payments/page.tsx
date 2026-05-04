import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { listPayments, type PaymentMethod } from "@/lib/payments";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { PaymentMethodBadge } from "@/components/payments/payment-method-badge";
import { PaymentOutcomeBadge } from "@/components/payments/payment-outcome-badge";
import { PaymentsFilters } from "@/components/payments/payments-filters";
import { RecordPaymentSheet } from "@/components/payments/record-payment-sheet";
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

export const metadata: Metadata = { title: "Payments" };

type SearchParams = Promise<{
  page?: string;
  search?: string;
  method?: string;
}>;

const PER_PAGE = 25;
const VALID_METHODS: readonly string[] = [
  "cash", "card", "bank_transfer", "whish", "omt", "areeba", "stripe", "other",
];

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const search = sp.search?.trim() || undefined;
  const method =
    sp.method && VALID_METHODS.includes(sp.method)
      ? (sp.method as PaymentMethod)
      : undefined;

  let list: Awaited<ReturnType<typeof listPayments>>;
  try {
    list = await listPayments({ page, perPage: PER_PAGE, search, method });
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

  // Compute today's totals (best-effort: only what's on the current page).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTotal = list.data.reduce((sum, p) => {
    if (!p.collected_at) return sum;
    const d = new Date(p.collected_at);
    return d >= today ? sum + p.amount : sum;
  }, 0);
  const pageTotal = list.data.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every cash collection, card swipe, and bank transfer. Recording a
            payment auto-applies it to the linked invoice.
          </p>
        </div>
        <RecordPaymentSheet />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="On this page"
          value={list.data.length.toString()}
          hint={`of ${list.meta.total} total`}
        />
        <SummaryCard
          label="Page total"
          value={formatMoney(pageTotal)}
          hint="all payments on this page"
        />
        <SummaryCard
          label="Today (this page)"
          value={formatMoney(todayTotal)}
          hint={`${list.data.filter((p) => p.collected_at && new Date(p.collected_at) >= today).length} payments today`}
          accent={todayTotal > 0}
        />
      </div>

      <PaymentsFilters />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Invoice</TableHead>
              <TableHead className="hidden lg:table-cell">Collector</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      No payments match your filters.
                    </span>
                    <span>
                      Click &ldquo;Record payment&rdquo; to add one manually,
                      or wait for a collector to mark an invoice paid.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(p.collected_at)}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {p.customer?.full_name ?? "—"}
                      </p>
                      {p.customer?.code && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {p.customer.code}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.invoice?.number ? (
                      <span className="font-mono text-xs">
                        {p.invoice.number}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Unallocated
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {p.collector?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <PaymentMethodBadge method={p.method} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    <div>{formatMoney(p.amount, p.currency)}</div>
                    {p.invoice && p.invoice.balance_due > 0 && (
                      <div className="text-[10px] font-normal text-amber-700 dark:text-amber-400">
                        {formatMoney(p.invoice.balance_due, p.currency)} left
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <PaymentOutcomeBadge
                      status={p.status}
                      invoice={p.invoice}
                      showSub
                    />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {p.notes || p.reference_number ? (
                      <div
                        className="max-w-[260px] cursor-help text-xs"
                        title={[p.reference_number ? `Ref: ${p.reference_number}` : "", p.notes ?? ""]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        {p.reference_number && (
                          <span className="me-1 inline-block rounded bg-muted px-1 font-mono text-[10px]">
                            {p.reference_number}
                          </span>
                        )}
                        {p.notes && (
                          <span className="line-clamp-2 text-muted-foreground">
                            {p.notes}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
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
          unit="payments"
        />
      </div>
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
              a tenant) to view payments.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in as a tenant admin
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
