import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  ShieldAlert,
  User,
} from "lucide-react";
import { getHandover } from "@/lib/handovers";
import { ApiError } from "@/lib/api";
import { HandoverDetailActions } from "./detail-actions";

export const metadata: Metadata = { title: "Handover · Cash" };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30",
  confirmed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30",
  disputed: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30",
};

const FORMAT_MONEY = (v: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);

export default async function HandoverDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let handover;
  try {
    const res = await getHandover(Number(id));
    handover = res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const declared = Number(handover.amount);
  const system = Number(handover.system_amount ?? 0);
  const diff = declared - system;
  const hasMismatch = Math.abs(diff) > 0.01;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/cash-handovers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Cash handovers
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Banknote className="size-6 text-primary" />
              Handover #{handover.id}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submitted{" "}
              {handover.handed_over_at
                ? new Date(handover.handed_over_at).toLocaleString()
                : "—"}{" "}
              by{" "}
              <span className="font-medium text-foreground">
                {handover.collector?.name ?? "—"}
              </span>
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset capitalize ${
              STATUS_STYLES[handover.status]
            }`}
          >
            {handover.status}
          </span>
        </div>
      </div>

      {/* Reconciliation summary */}
      <section
        className={`rounded-xl border p-5 ${
          hasMismatch && handover.status === "pending"
            ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20"
            : "bg-card"
        }`}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <ReconCard
            label="Collector declared"
            value={FORMAT_MONEY(declared, handover.currency)}
            icon={User}
          />
          <ReconCard
            label="System total"
            value={FORMAT_MONEY(system, handover.currency)}
            icon={Banknote}
            hint={`${handover.payments?.length ?? 0} payment${(handover.payments?.length ?? 0) === 1 ? "" : "s"} bundled`}
          />
          <ReconCard
            label={diff < 0 ? "Short" : diff > 0 ? "Over" : "Match"}
            value={hasMismatch ? FORMAT_MONEY(Math.abs(diff)) : "$0.00"}
            icon={hasMismatch ? AlertTriangle : CheckCircle2}
            tone={hasMismatch ? "warn" : "ok"}
          />
        </div>

        {handover.notes && (
          <div className="mt-4 rounded-lg border bg-card p-3 text-sm">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Collector note
            </p>
            <p className="mt-0.5">{handover.notes}</p>
          </div>
        )}

        {handover.dispute_reason && (
          <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50/60 p-3 text-sm dark:bg-rose-950/30">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              <ShieldAlert className="size-3" />
              Dispute / resolution log
            </p>
            <p className="mt-1 whitespace-pre-line text-rose-900 dark:text-rose-200">
              {handover.dispute_reason}
            </p>
          </div>
        )}
      </section>

      {/* Actions */}
      <HandoverDetailActions
        id={handover.id}
        status={handover.status}
        declaredAmount={declared}
        systemAmount={system}
      />

      {/* Payments bundled */}
      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">
            Payments in this bundle ({handover.payments?.length ?? 0})
          </h2>
          <Clock className="size-4 text-muted-foreground" />
        </header>
        {!handover.payments || handover.payments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No payments linked to this handover.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left">Customer</th>
                <th className="px-5 py-2 text-left">Invoice</th>
                <th className="px-5 py-2 text-left">When</th>
                <th className="px-5 py-2 text-left">Notes</th>
                <th className="px-5 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {handover.payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-5 py-2.5">
                    <div className="font-medium">
                      {p.customer?.full_name ?? "—"}
                    </div>
                    {p.customer?.code && (
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {p.customer.code}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs">
                    {p.invoice?.number ?? "—"}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">
                    {p.collected_at
                      ? new Date(p.collected_at).toLocaleString([], {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground max-w-[260px]">
                    {p.notes ? (
                      <span className="line-clamp-2">{p.notes}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold">
                    ${p.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30">
                <td
                  colSpan={4}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  System total
                </td>
                <td className="px-5 py-2 text-right font-mono tabular-nums text-sm font-semibold">
                  {FORMAT_MONEY(system, handover.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function ReconCard({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "warn" | "ok";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon
          className={`size-4 ${
            tone === "warn"
              ? "text-amber-600"
              : tone === "ok"
                ? "text-emerald-600"
                : ""
          }`}
        />
        {label}
      </div>
      <p
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
          tone === "warn"
            ? "text-amber-700 dark:text-amber-400"
            : tone === "ok"
              ? "text-emerald-700 dark:text-emerald-400"
              : ""
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
