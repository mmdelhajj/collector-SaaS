"use client";

import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Hash,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  StickyNote,
  UserCog,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AuditEntry,
  FailureEntry,
  HandoverEntry,
  PaymentEntry,
  TimelineEntry,
} from "@/lib/collector-period";

const FORMAT_MONEY = (v: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  whish: "Whish",
  omt: "OMT",
  areeba: "Areeba",
  card: "Card",
  bank_transfer: "Bank",
  stripe: "Stripe",
  other: "Other",
};

const FAILURE_LABELS: Record<string, string> = {
  customer_not_home: "Customer not home",
  refused: "Customer refused",
  partial_payment: "Couldn't complete (partial)",
  dispute: "Dispute",
  other: "Other reason",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-muted-foreground">
        No activity yet for this period.
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((e) => (
        <li key={e.id}>
          {e.kind === "payment" ? (
            <PaymentCard entry={e} />
          ) : e.kind === "failure" ? (
            <FailureCard entry={e} />
          ) : e.kind === "handover" ? (
            <HandoverCard entry={e} />
          ) : (
            <AuditCard entry={e} />
          )}
        </li>
      ))}
    </ul>
  );
}

function PaymentCard({ entry: e }: { entry: PaymentEntry }) {
  const total = e.invoice?.total ?? null;
  const balance = e.invoice?.balance_due ?? null;
  const isPartial = !e.cleared && total !== null;
  const tone = e.cleared ? "emerald" : isPartial ? "amber" : "emerald";

  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
          tone === "emerald"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
            : "bg-amber-50 text-amber-700 ring-amber-600/20",
        )}
      >
        <CircleDollarSign className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Payment recorded —{" "}
              {e.customer ? (
                <Link
                  href={`/customers/${e.customer.id}`}
                  className="hover:underline"
                >
                  {e.customer.full_name}
                </Link>
              ) : (
                "—"
              )}
              {e.customer?.code && (
                <span className="ms-2 font-mono text-[11px] font-normal text-muted-foreground">
                  {e.customer.code}
                </span>
              )}
            </p>
            {e.invoice?.number && (
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {e.invoice.number}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatTime(e.when)}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 p-2.5 text-xs">
          <Money
            label="Paid"
            value={FORMAT_MONEY(e.amount, e.currency)}
            tone="emerald"
            sublabel={METHOD_LABELS[e.method] ?? e.method}
          />
          {total !== null ? (
            <Money
              label="Invoice"
              value={FORMAT_MONEY(total, e.currency)}
              sublabel={
                e.invoice?.status === "paid"
                  ? "fully paid"
                  : (e.invoice?.status ?? "")
              }
            />
          ) : (
            <Money label="Invoice" value="—" sublabel="unallocated" />
          )}
          {balance !== null ? (
            <Money
              label={e.cleared ? "Cleared" : "Still owed"}
              value={
                e.cleared ? FORMAT_MONEY(0) : FORMAT_MONEY(balance, e.currency)
              }
              tone={e.cleared ? "emerald" : "amber"}
              sublabel={e.cleared ? "✓ closed" : "remaining"}
            />
          ) : (
            <Money label="Balance" value="—" sublabel="" />
          )}
        </div>

        {(e.notes || e.reference_number) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {e.reference_number && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                <Hash className="size-3" />
                {e.reference_number}
              </span>
            )}
            {e.notes && (
              <span className="inline-flex items-start gap-1 rounded-md border px-2 py-1 text-[11px] text-foreground">
                <StickyNote className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                <span>{e.notes}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Money({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "emerald" | "amber";
}) {
  const colors =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : "";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-sm font-semibold tabular-nums",
          colors,
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

function FailureCard({ entry: e }: { entry: FailureEntry }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400">
        <XCircle className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-semibold">
            Couldn&rsquo;t collect —{" "}
            {e.customer ? (
              <Link
                href={`/customers/${e.customer.id}`}
                className="hover:underline"
              >
                {e.customer.full_name}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {formatTime(e.when)}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {e.invoice?.number ?? "—"}
          {e.invoice?.balance_due != null && (
            <span className="ms-2">
              · still owed{" "}
              <span className="font-semibold text-foreground">
                {FORMAT_MONEY(e.invoice.balance_due)}
              </span>
            </span>
          )}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="size-3" />
          {FAILURE_LABELS[e.failure_reason ?? ""] ?? e.failure_reason ?? "—"}
        </p>
        {e.failure_notes && (
          <p className="mt-1 text-xs text-muted-foreground">
            <StickyNote className="me-1 inline size-3" />
            {e.failure_notes}
          </p>
        )}
      </div>
    </div>
  );
}

function HandoverCard({ entry: e }: { entry: HandoverEntry }) {
  const tone =
    e.status === "confirmed"
      ? "emerald"
      : e.status === "disputed"
        ? "rose"
        : "amber";
  const Icon =
    e.status === "confirmed"
      ? ShieldCheck
      : e.status === "disputed"
        ? ShieldAlert
        : Banknote;
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
          tone === "emerald"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
            : tone === "rose"
              ? "bg-rose-50 text-rose-700 ring-rose-600/20"
              : "bg-amber-50 text-amber-700 ring-amber-600/20",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <Link
            href={`/cash-handovers/${e.handover_id}`}
            className="text-sm font-semibold hover:underline"
          >
            Handover #{e.handover_id} ·{" "}
            <span className="font-mono">
              {FORMAT_MONEY(e.amount, e.currency)}
            </span>{" "}
            <span className="capitalize text-muted-foreground font-normal">
              ({e.status})
            </span>
          </Link>
          <span className="text-[11px] text-muted-foreground">
            {formatTime(e.when)}
          </span>
        </div>
        {e.notes && (
          <p className="mt-1 text-xs text-muted-foreground">
            <StickyNote className="me-1 inline size-3" />
            {e.notes}
          </p>
        )}
        {e.dispute_reason && (
          <p className="mt-1 whitespace-pre-line rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950/30">
            {e.dispute_reason}
          </p>
        )}
      </div>
    </div>
  );
}

const AUDIT_META: Record<
  string,
  { icon: LucideIcon; color: string; label: string }
> = {
  "user.role_changed": {
    icon: UserCog,
    color: "text-sky-600",
    label: "Role changed",
  },
  "user.password_reset": {
    icon: KeyRound,
    color: "text-amber-600",
    label: "Password reset",
  },
  "user.deactivated": {
    icon: UserCog,
    color: "text-rose-600",
    label: "Deactivated",
  },
  "user.reactivated": {
    icon: UserCog,
    color: "text-emerald-600",
    label: "Reactivated",
  },
  "radius.suspended": {
    icon: ShieldAlert,
    color: "text-amber-600",
    label: "Service suspended",
  },
  "radius.reactivated": {
    icon: ShieldCheck,
    color: "text-emerald-600",
    label: "Service reactivated",
  },
};

function AuditCard({ entry: e }: { entry: AuditEntry }) {
  const meta = AUDIT_META[e.action] ?? {
    icon: CheckCircle2,
    color: "text-zinc-500",
    label: e.action,
  };
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Icon className={`mt-0.5 size-4 shrink-0 ${meta.color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{meta.label}</p>
        {e.subject_label && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {e.subject_label}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {formatTime(e.when)}
      </span>
    </div>
  );
}
