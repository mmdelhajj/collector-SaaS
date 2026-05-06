import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getInvoice, getInvoicePublicLink } from "@/lib/invoices";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoicePublicLinkActions } from "@/components/invoices/invoice-public-link-actions";
import { InvoiceShareActions } from "@/components/invoices/invoice-share-actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatPeriod(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  const sFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(s);
  const eFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(e);
  return `${sFmt} – ${eFmt}`;
}

function formatQty(value: number): string {
  const trimmed = value.toFixed(2).replace(/\.?0+$/, "");
  return trimmed;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUser();
  if (!me) redirect("/login");

  let invoice: Awaited<ReturnType<typeof getInvoice>>["data"];
  let publicLink: Awaited<ReturnType<typeof getInvoicePublicLink>>["data"];

  try {
    const [inv, pl] = await Promise.all([
      getInvoice(id),
      getInvoicePublicLink(id),
    ]);
    invoice = inv.data;
    publicLink = pl.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const customer = invoice.customer;
  const items = invoice.items ?? [];
  const period = formatPeriod(invoice.period_start, invoice.due_at);
  const periodLabel = formatPeriod(invoice.period_start, invoice.period_end);
  const tenantName = invoice.tenant?.name ?? "RunCollect";
  const tenantTimezone = invoice.tenant?.timezone ?? "Asia/Beirut";

  // Build address line from whatever the customer has populated
  const addressBits = [
    customer?.address_line,
    customer?.neighborhood,
    customer?.district,
    customer?.city,
  ].filter(Boolean) as string[];
  const fullAddress = addressBits.join(" — ");

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      {/* Top bar — back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to invoices
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/dl/invoice/${invoice.id}`}
            download={`${invoice.number}.pdf`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="size-4" />
            Download PDF
          </a>
          <InvoicePublicLinkActions
            url={publicLink.url}
            expiresInDays={publicLink.expires_in_days}
          />
        </div>
      </div>

      {customer && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-muted/30 px-4 py-2">
          <span className="me-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Send to {customer.full_name.split(" ")[0]}
          </span>
          <InvoiceShareActions
            customer={customer}
            invoiceNumber={invoice.number}
            publicUrl={publicLink.url}
            amountLabel={formatMoney(invoice.balance_due, invoice.currency)}
            tenantName={tenantName}
          />
        </div>
      )}

      {/* Invoice card — visual parity with the PDF + public-web template */}
      <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-primary px-8 py-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-6"
              >
                <g
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  <path d="M4 12 L7 16 L4 20" strokeWidth="2" opacity="0.3" />
                  <path d="M8 12 L11 16 L8 20" strokeWidth="2" opacity="0.55" />
                  <path
                    d="M12 12 L15 16 L12 20"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                  <path d="M16 18 L20 22 L28 8" strokeWidth="3.5" />
                </g>
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight">{tenantName}</p>
              <p className="text-[11px] text-muted-foreground">
                {(invoice.currency ?? "USD").toUpperCase()} · {tenantTimezone}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Invoice
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
              {invoice.number}
            </p>
            <div className="mt-2">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="space-y-6 px-8 py-6">
          {/* BILL TO + INVOICE DETAILS panels */}
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border bg-muted/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Bill to
              </p>
              <p className="mt-2 text-sm font-semibold" dir="auto">
                {customer?.full_name ?? "—"}
              </p>
              {customer?.email && (
                <p className="mt-0.5 text-xs text-muted-foreground" dir="auto">
                  {customer.email}
                </p>
              )}
              {customer?.phone_primary && (
                <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                  {customer.phone_primary}
                </p>
              )}
              {fullAddress && (
                <p
                  className="mt-0.5 text-xs leading-relaxed text-muted-foreground"
                  dir="auto"
                >
                  {fullAddress}
                </p>
              )}
            </section>

            <section className="rounded-lg border bg-muted/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Invoice details
              </p>
              <dl className="mt-2 space-y-1 text-xs">
                <DetailRow label="Invoice No." value={invoice.number} />
                <DetailRow
                  label="Issue Date"
                  value={formatDate(invoice.issued_at)}
                />
                <DetailRow
                  label="Due Date"
                  value={formatDate(invoice.due_at)}
                />
                {periodLabel && (
                  <DetailRow label="Period" value={periodLabel} />
                )}
                <DetailRow
                  label="Status"
                  value={invoice.status.toUpperCase()}
                  bold
                />
              </dl>
            </section>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground/80 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2.5 text-left">Description</th>
                  <th className="py-2.5 text-right">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const meta = item.meta as {
                    speed_down_mbps?: number;
                    speed_up_mbps?: number;
                  } | null;
                  return (
                    <tr key={item.id} className="border-b border-border/40">
                      <td className="py-3 align-top" dir="auto">
                        <div className="font-medium text-foreground">
                          {item.description}
                        </div>
                        {meta?.speed_down_mbps && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {meta.speed_down_mbps} / {meta.speed_up_mbps ?? "—"}{" "}
                            Mbps
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right text-muted-foreground tabular-nums">
                        {formatQty(item.quantity)}
                      </td>
                      <td className="py-3 text-right text-muted-foreground tabular-nums">
                        {formatMoney(item.unit_price, invoice.currency)}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatMoney(item.total, invoice.currency)}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notes + Totals */}
          <div className="grid gap-6 sm:grid-cols-5">
            <div className="sm:col-span-3">
              {invoice.notes && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Notes
                  </p>
                  <div
                    className="mt-2 whitespace-pre-wrap rounded-md border-l-[3px] border-primary bg-muted/30 px-3 py-2.5 text-sm leading-relaxed"
                    dir="auto"
                  >
                    {invoice.notes}
                  </div>
                </>
              )}
            </div>
            <div className="sm:col-span-2">
              <table className="w-full text-sm">
                <tbody>
                  <TotalRow
                    label="Subtotal"
                    value={formatMoney(invoice.subtotal, invoice.currency)}
                  />
                  {invoice.tax_amount > 0 && (
                    <TotalRow
                      label="Tax"
                      value={formatMoney(invoice.tax_amount, invoice.currency)}
                    />
                  )}
                  {invoice.discount_amount > 0 && (
                    <TotalRow
                      label="Discount"
                      value={`−${formatMoney(invoice.discount_amount, invoice.currency)}`}
                    />
                  )}
                  <tr className="border-t-2 border-foreground">
                    <td className="py-2.5 text-base font-bold">Total</td>
                    <td className="py-2.5 text-right text-base font-bold tabular-nums">
                      {formatMoney(invoice.total, invoice.currency)}
                    </td>
                  </tr>
                  {invoice.paid_amount > 0 && (
                    <TotalRow
                      label="Paid"
                      value={`−${formatMoney(invoice.paid_amount, invoice.currency)}`}
                    />
                  )}
                  <tr className="border-t border-border/60">
                    <td className="py-2.5 text-sm font-bold text-primary">
                      Balance Due
                    </td>
                    <td className="py-2.5 text-right text-sm font-bold tabular-nums text-primary">
                      {formatMoney(invoice.balance_due, invoice.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* QR + scan-to-view */}
          <div className="grid items-center gap-4 border-t pt-6 sm:grid-cols-[120px_1fr]">
            <div
              className="rounded-md border bg-white p-2"
              // The QR SVG comes server-side from a trusted endpoint we own.
              // It is *only* an SVG generated by bacon-qr-code (no scripts).
              dangerouslySetInnerHTML={{ __html: publicLink.qr_svg }}
            />
            <div className="text-sm">
              <p className="font-semibold text-foreground">
                Scan to view invoice
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Open this invoice on any device — view payment status, download
                a fresh PDF, or share with the customer. Link expires in{" "}
                {publicLink.expires_in_days} days.
              </p>
              <p className="mt-2 break-all text-[10px] text-muted-foreground">
                {publicLink.url}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{tenantName}</p>
            <p>Thank you for your business</p>
          </div>
        </div>
      </article>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-xs",
          bold ? "font-bold tracking-wide" : "font-medium",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1.5 text-sm text-muted-foreground">{label}</td>
      <td className="py-1.5 text-right text-sm tabular-nums">{value}</td>
    </tr>
  );
}
