"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  bulkAssignAction,
  fetchCollectorsAction,
  type CollectorOption,
} from "@/app/(dashboard)/invoices/bulk-assign-actions";
import type { CustomerOutstanding } from "@/lib/customers";
import { cn } from "@/lib/utils";

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

const BUCKET_TONES: Record<string, string> = {
  "Not yet due":
    "border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20",
  "1–30 days":
    "border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20",
  "31–60 days":
    "border-orange-300 text-orange-700 dark:text-orange-400 bg-orange-50/40 dark:bg-orange-950/20",
  "61–90 days":
    "border-rose-300 text-rose-700 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20",
  "90+ days":
    "border-rose-500 text-rose-800 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/40",
};

export function OutstandingPanel({
  outstanding,
  customerName,
}: {
  outstanding: CustomerOutstanding;
  customerName: string;
}) {
  if (outstanding.invoice_count === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50/40 p-4 dark:bg-emerald-950/20">
        <CheckCircle2 className="size-5 text-emerald-600" />
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          <span className="font-semibold">{customerName}</span> is fully paid up
          — no outstanding balance.
        </p>
      </div>
    );
  }

  const isUrgent = outstanding.oldest_overdue_days >= 30;

  return (
    <section
      className={cn(
        "rounded-xl border p-5",
        isUrgent
          ? "border-rose-300 bg-rose-50/40 dark:bg-rose-950/20"
          : "bg-card",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {isUrgent && <AlertTriangle className="size-4 text-rose-600" />}
            Outstanding balance
          </h2>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
            {FORMAT_MONEY(outstanding.total_outstanding)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {outstanding.invoice_count} unpaid invoice
            {outstanding.invoice_count === 1 ? "" : "s"}
            {outstanding.oldest_overdue_days > 0 && (
              <>
                {" "}
                · oldest{" "}
                <span
                  className={
                    isUrgent
                      ? "font-semibold text-rose-700 dark:text-rose-400"
                      : ""
                  }
                >
                  {outstanding.oldest_overdue_days} day
                  {outstanding.oldest_overdue_days === 1 ? "" : "s"} overdue
                </span>
              </>
            )}
          </p>
        </div>
        <SendToCollectorButton
          allInvoiceIds={outstanding.all_invoice_ids}
          customerName={customerName}
          totalAmount={outstanding.total_outstanding}
        />
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {outstanding.buckets.map((b) => (
          <div
            key={b.label}
            className={cn(
              "rounded-lg border p-3",
              b.count === 0
                ? "border-border bg-muted/20 text-muted-foreground"
                : (BUCKET_TONES[b.label] ?? ""),
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider">
              {b.label}
            </p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums">
              {b.count > 0 ? FORMAT_MONEY(b.total) : "—"}
            </p>
            {b.count > 0 && (
              <p className="text-[10px] opacity-70">
                {b.count} invoice{b.count === 1 ? "" : "s"}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SendToCollectorButton({
  allInvoiceIds,
  customerName,
  totalAmount,
}: {
  allInvoiceIds: string[];
  customerName: string;
  totalAmount: number;
}) {
  const [open, setOpen] = useState(false);
  const [collectors, setCollectors] = useState<CollectorOption[] | null>(null);
  const [collectorId, setCollectorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchCollectorsAction()
      .then((res) => {
        if (res.ok && res.collectors) {
          setCollectors(res.collectors);
          setCollectorId(res.collectors[0]?.id ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [open]);

  function submit() {
    if (!collectorId || !collectors) return;
    const collector = collectors.find((c) => c.id === collectorId);
    if (!collector) return;
    startTransition(async () => {
      const res = await bulkAssignAction(
        collectorId,
        collector.name,
        allInvoiceIds,
        3,
        false,
      );
      if (res.ok && res.result) {
        toast.success(
          `Assigned ${res.result.assigned} invoice${res.result.assigned === 1 ? "" : "s"} to ${res.result.collectorName}`,
        );
        setOpen(false);
      } else {
        toast.error(res.error ?? "Could not assign");
      }
    });
  }

  if (allInvoiceIds.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
        <MapPin className="size-4" />
        Send all to collector
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Send to collector</SheetTitle>
          <SheetDescription>
            Bundle all <b>{allInvoiceIds.length}</b> unpaid invoice
            {allInvoiceIds.length === 1 ? "" : "s"} for <b>{customerName}</b> (
            {FORMAT_MONEY(totalAmount)}) onto a collector&rsquo;s route.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-2">
          {loading && (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="me-2 size-4 animate-spin" />
              Loading collectors…
            </div>
          )}
          {!loading && collectors && collectors.length === 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              No active collectors. Invite one from{" "}
              <span className="font-mono">/settings/users</span>.
            </div>
          )}
          {!loading &&
            collectors?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCollectorId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                  collectorId === c.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40",
                )}
              >
                <span className="text-sm font-medium">{c.name}</span>
                {collectorId === c.id && (
                  <ChevronRight className="size-4 text-primary" />
                )}
              </button>
            ))}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending || !collectorId}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Assigning…
              </>
            ) : (
              `Assign ${allInvoiceIds.length} invoice${allInvoiceIds.length === 1 ? "" : "s"}`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
