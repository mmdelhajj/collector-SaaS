import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  Download,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Wallet,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getCustomer, getCustomerOutstanding } from "@/lib/customers";
import { OutstandingPanel } from "@/components/customers/outstanding-panel";
import { listInvoices } from "@/lib/invoices";
import { listPayments } from "@/lib/payments";
import { StatusBadge } from "@/components/customers/status-badge";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { ServiceCategoryBadge } from "@/components/service-category-badge";
import { PaymentMethodBadge } from "@/components/payments/payment-method-badge";
import { PaymentOutcomeBadge } from "@/components/payments/payment-outcome-badge";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
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

export const metadata: Metadata = { title: "Customer profile" };

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

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let customer: Awaited<ReturnType<typeof getCustomer>>["data"];
  let invoices: Awaited<ReturnType<typeof listInvoices>>;
  let payments: Awaited<ReturnType<typeof listPayments>>;
  let outstanding: Awaited<ReturnType<typeof getCustomerOutstanding>>;

  try {
    const [c, invs, pays, out] = await Promise.all([
      getCustomer(id),
      listInvoices({ customerId: id, perPage: 50 }),
      listPayments({ customerId: id, perPage: 25 }),
      getCustomerOutstanding(id),
    ]);
    customer = c.data;
    invoices = invs;
    payments = pays;
    outstanding = out;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 404) notFound();
      if (err.status === 400) {
        const u = await getCurrentUser();
        return <NoTenantContext email={u?.email ?? ""} />;
      }
    }
    throw err;
  }

  // Group open invoices by service category for the "what they owe" panel.
  const openInvoices = invoices.data.filter(
    (i) => i.balance_due > 0 && i.status !== "cancelled" && i.status !== "void",
  );
  const grouped = new Map<
    string,
    { name: string; balance: number; invoices: typeof openInvoices }
  >();
  for (const inv of openInvoices) {
    const key = inv.service_category?.name ?? "Uncategorised";
    const cur = grouped.get(key) ?? { name: key, balance: 0, invoices: [] };
    cur.balance += inv.balance_due;
    cur.invoices.push(inv);
    grouped.set(key, cur);
  }

  const totalOwed = openInvoices.reduce((s, i) => s + i.balance_due, 0);
  const initials =
    `${customer.first_name[0] ?? ""}${customer.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3" />
        Back to customers
      </Link>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 border">
              <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {customer.full_name}
                </h1>
                <StatusBadge status={customer.status} />
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {customer.code}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {customer.phone_primary && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {customer.phone_primary}
                  </span>
                )}
                {customer.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {customer.email}
                  </span>
                )}
                {customer.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {customer.city}
                    {customer.address_line && `, ${customer.address_line}`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Outstanding balance
            </p>
            <p
              className={cn(
                "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                totalOwed > 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {formatMoney(totalOwed)}
            </p>
            <div className="mt-2 flex items-center justify-end gap-1">
              <CustomerRowActions customer={customer} />
            </div>
          </div>
        </div>
      </div>

      {/* Aging breakdown + send-all-to-collector */}
      <OutstandingPanel
        outstanding={outstanding}
        customerName={customer.full_name}
      />

      {/* Owed-by-service panel */}
      {grouped.size > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold">Owed by service</h2>
            <p className="text-xs text-muted-foreground">
              Each line is one open invoice. Pay them individually — partial
              payment on one service doesn&rsquo;t block the others.
            </p>
          </div>
          <div className="divide-y">
            {Array.from(grouped.values())
              .sort((a, b) => b.balance - a.balance)
              .map((g) => (
                <div key={g.name} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <ServiceCategoryBadge name={g.name} />
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatMoney(g.balance)}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {g.invoices.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-xs hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-foreground">
                            {inv.number}
                          </span>
                          <InvoiceStatusBadge status={inv.status} />
                          <span className="text-muted-foreground">
                            due {formatDate(inv.due_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-semibold">
                            {formatMoney(inv.balance_due, inv.currency)}
                          </span>
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="PDF"
                            aria-label="Download invoice PDF"
                          >
                            <Download className="size-3" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* All invoices */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">All invoices</h2>
              <p className="text-xs text-muted-foreground">
                Most recent first · {invoices.meta.total} total
              </p>
            </div>
            <Receipt className="size-4 text-muted-foreground" />
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Number</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center">
                    <span className="text-xs text-muted-foreground">
                      No invoices yet.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.data.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {inv.number}
                    </TableCell>
                    <TableCell>
                      <ServiceCategoryBadge
                        name={inv.service_category?.name ?? null}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Recent payments */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Recent payments</h2>
              <p className="text-xs text-muted-foreground">
                Last 25 · {payments.meta.total} total
              </p>
            </div>
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>When</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center">
                    <span className="text-xs text-muted-foreground">
                      No payments yet.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                payments.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground align-top">
                      {formatDateTime(p.collected_at)}
                      {p.collector?.name && (
                        <div className="mt-0.5 text-[10px]">
                          {p.collector.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {p.invoice ? (
                        <span className="font-mono text-xs">
                          {p.invoice.number}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <PaymentMethodBadge method={p.method} />
                      <div className="mt-1">
                        <PaymentOutcomeBadge
                          status={p.status}
                          invoice={p.invoice}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold align-top">
                      <div>{formatMoney(p.amount, p.currency)}</div>
                      {p.invoice && p.invoice.balance_due > 0 && (
                        <div className="text-[10px] font-normal text-amber-700">
                          {formatMoney(p.invoice.balance_due, p.currency)} left
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top max-w-[280px]">
                      {p.notes || p.reference_number ? (
                        <div className="text-xs">
                          {p.reference_number && (
                            <div className="me-1 inline-block rounded bg-muted px-1 font-mono text-[10px]">
                              ref: {p.reference_number}
                            </div>
                          )}
                          {p.notes && (
                            <div className="mt-0.5 text-muted-foreground line-clamp-3">
                              {p.notes}
                            </div>
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
        </div>
      </div>
    </div>
  );
}

function NoTenantContext({ email }: { email: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:px-8">
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          No tenant selected
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in as a tenant admin (e.g.{" "}
          <span className="font-mono">{email}</span> needs a tenant) to view
          this profile.
        </p>
        <div className="mt-6">
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Sign in as a tenant admin
          </Link>
        </div>
      </div>
    </div>
  );
}
