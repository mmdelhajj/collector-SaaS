"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Download,
  GripVertical,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LocalDateTime } from "@/components/ui/local-datetime";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { ServiceCategoryBadge } from "@/components/service-category-badge";
import {
  bulkAssignAction,
  fetchCollectorsAction,
  type CollectorOption,
} from "@/app/(dashboard)/invoices/bulk-assign-actions";
import type { Invoice } from "@/lib/invoices-types";
import { cn } from "@/lib/utils";

const FORMAT_MONEY = (v: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export function InvoicesSelectableTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

  const assignableIds = useMemo(
    () =>
      invoices
        .filter((i) => ["open", "partial", "overdue"].includes(i.status))
        .map((i) => i.id),
    [invoices],
  );

  const allChecked =
    assignableIds.length > 0 && assignableIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(assignableIds));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const selectedInvoices = invoices.filter((i) => selected.has(i.id));
  const selectedTotal = selectedInvoices.reduce((s, i) => s + i.balance_due, 0);

  return (
    <>
      {/* Selection summary bar — only shows when something is selected */}
      {selected.size > 0 && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-y bg-primary/5 px-4 py-2 lg:-mx-8 lg:px-8">
            <div className="text-sm">
              <span className="font-semibold">{selected.size}</span> invoice
              {selected.size === 1 ? "" : "s"} selected ·{" "}
              <span className="font-semibold tabular-nums">
                {FORMAT_MONEY(selectedTotal)}
              </span>{" "}
              total
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
              <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
                <MapPin className="size-4" />
                Assign to collector
              </SheetTrigger>
            </div>
          </div>

          <BulkAssignSheetContent
            invoices={selectedInvoices}
            invoiceTotal={selectedTotal}
            onAssigned={() => {
              setSelected(new Set());
              setSheetOpen(false);
              router.refresh();
            }}
            onClose={() => setSheetOpen(false)}
          />
        </Sheet>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[36px]">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={toggleAll}
                  aria-label="Select all assignable invoices on this page"
                  disabled={assignableIds.length === 0}
                />
              </TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Service</TableHead>
              <TableHead className="hidden lg:table-cell">Issued</TableHead>
              <TableHead className="hidden lg:table-cell">Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Collector</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center">
                  <span className="text-sm text-muted-foreground">
                    No invoices match your filters.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const assignable = ["open", "partial", "overdue"].includes(
                  inv.status,
                );
                return (
                  <TableRow
                    key={inv.id}
                    className={cn(selected.has(inv.id) && "bg-primary/5")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(inv.id)}
                        onCheckedChange={() => toggleOne(inv.id)}
                        disabled={!assignable}
                        aria-label={`Select invoice ${inv.number}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7 border">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                            {(inv.customer?.full_name ?? "?")
                              .split(" ")
                              .slice(0, 2)
                              .map((p) => p[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {inv.customer?.full_name ?? "—"}
                          </p>
                          {inv.customer?.code && (
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {inv.customer.code}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <ServiceCategoryBadge
                        name={inv.service_category?.name ?? null}
                      />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      <LocalDateTime
                        iso={inv.issued_at}
                        mode="date"
                        options={DATE_OPTIONS}
                      />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      <LocalDateTime
                        iso={inv.due_at}
                        mode="date"
                        options={DATE_OPTIONS}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {FORMAT_MONEY(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={
                          inv.balance_due > 0
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {FORMAT_MONEY(inv.balance_due, inv.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <CollectorCell assignment={inv.assignment ?? null} />
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/dl/invoice/${inv.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Download PDF"
                        aria-label="Download PDF"
                      >
                        <Download className="size-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function BulkAssignSheetContent({
  invoices,
  invoiceTotal,
  onAssigned,
  onClose,
}: {
  invoices: Invoice[];
  invoiceTotal: number;
  onAssigned: () => void;
  onClose: () => void;
}) {
  const [collectors, setCollectors] = useState<CollectorOption[] | null>(null);
  const [collectorId, setCollectorId] = useState<number | null>(null);
  const [priority, setPriority] = useState(3);
  const [useOrder, setUseOrder] = useState(false);
  // Working copy of selected invoices in the order they'll be assigned.
  const [orderedIds, setOrderedIds] = useState<string[]>(
    invoices.map((i) => i.id),
  );
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Re-sync if the selection changes underneath us.
  useEffect(() => {
    setOrderedIds(invoices.map((i) => i.id));
  }, [invoices]);

  useEffect(() => {
    setError(null);
    setLoading(true);
    fetchCollectorsAction()
      .then((res) => {
        if (res.ok && res.collectors) {
          setCollectors(res.collectors);
          setCollectorId(res.collectors[0]?.id ?? null);
        } else {
          setError(res.error ?? "Could not load collectors.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const invoiceCount = invoices.length;
  const invoiceById = useMemo(
    () => new Map(invoices.map((i) => [i.id, i])),
    [invoices],
  );

  function moveItem(id: string, direction: -1 | 1) {
    setOrderedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapWith = idx + direction;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  function submit() {
    if (!collectorId || !collectors) return;
    const collector = collectors.find((c) => c.id === collectorId);
    if (!collector) return;
    startTransition(async () => {
      const res = await bulkAssignAction(
        collectorId,
        collector.name,
        orderedIds,
        priority,
        useOrder,
      );
      if (res.ok && res.result) {
        toast.success(
          `Assigned ${res.result.assigned} to ${res.result.collectorName}`,
          {
            description:
              res.result.skipped > 0
                ? `${res.result.skipped} skipped (already paid or unassignable).`
                : useOrder
                  ? "Route ordered — they'll visit in that sequence."
                  : "All invoices added to today's route.",
          },
        );
        onAssigned();
      } else {
        toast.error(res.error ?? "Could not assign.");
      }
    });
  }

  return (
    <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Assign to collector</SheetTitle>
        <SheetDescription>
          <span className="font-semibold">{invoiceCount}</span> invoice
          {invoiceCount === 1 ? "" : "s"} ·{" "}
          <span className="font-semibold tabular-nums">
            {FORMAT_MONEY(invoiceTotal)}
          </span>{" "}
          total to collect.
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
        {loading && (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="me-2 size-4 animate-spin" /> Loading collectors…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && collectors && collectors.length === 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            No active collectors found. Invite one from{" "}
            <span className="font-mono">/settings/users</span>.
          </div>
        )}

        {!loading && collectors && collectors.length > 0 && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Collector</Label>
              <div className="space-y-2">
                {collectors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCollectorId(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      collectorId === c.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <Avatar className="size-8 border">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {c.name
                          .split(" ")
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={useOrder}
                  onChange={(e) => setUseOrder(e.target.checked)}
                  className="mt-0.5 size-4 rounded border"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    Set custom priority order
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {useOrder
                      ? "Drag the up/down arrows to choose who the collector visits first, second, third…"
                      : "All invoices will share the same priority. Turn on to rank them individually."}
                  </p>
                </div>
              </label>

              {!useOrder && (
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="priority" className="text-sm font-medium">
                    Priority for all
                  </Label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value={1}>1 — highest (do first)</option>
                    <option value={2}>2</option>
                    <option value={3}>3 — normal</option>
                    <option value={4}>4</option>
                    <option value={5}>5 — lowest</option>
                  </select>
                </div>
              )}
            </div>

            {useOrder && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Visit order ({orderedIds.length})
                </Label>
                <ol className="space-y-1.5">
                  {orderedIds.map((id, idx) => {
                    const inv = invoiceById.get(id);
                    if (!inv) return null;
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-lg border bg-card p-2"
                      >
                        <GripVertical className="size-4 text-muted-foreground/50" />
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {inv.customer?.full_name ?? "—"}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-mono">{inv.number}</span>
                            <span className="font-mono tabular-nums">
                              {FORMAT_MONEY(inv.balance_due, inv.currency)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveItem(id, -1)}
                            disabled={idx === 0}
                            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(id, 1)}
                            disabled={idx === orderedIds.length - 1}
                            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="text-[11px] text-muted-foreground">
                  Position 1 = first visit (priority 1). Lower positions get
                  lower priority badges.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t px-0 pt-4">
        <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
          Cancel
        </SheetClose>
        <Button
          type="button"
          onClick={submit}
          disabled={isPending || !collectorId || invoiceCount === 0}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Assigning…
            </>
          ) : (
            `Assign ${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"}`
          )}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}

const PRIORITY_BADGE: Record<number, string> = {
  1: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
  2: "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950/30 dark:text-orange-400",
  3: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
  4: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/30 dark:text-sky-400",
  5: "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900/40 dark:text-zinc-400",
};

function CollectorCell({ assignment }: { assignment: Invoice["assignment"] }) {
  if (!assignment || !assignment.collector) {
    return <span className="text-xs text-muted-foreground">Unassigned</span>;
  }
  const initials = assignment.collector.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6 border">
        <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
          {initials || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">
          {assignment.collector.name}
        </p>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center rounded px-1 py-0 text-[9px] font-semibold ring-1 ring-inset",
              PRIORITY_BADGE[assignment.priority] ?? PRIORITY_BADGE[3],
            )}
            title={`Priority ${assignment.priority}`}
          >
            P{assignment.priority}
          </span>
          {assignment.route_order != null && (
            <span className="text-[10px] text-muted-foreground">
              #{assignment.route_order}
            </span>
          )}
          {assignment.status === "in_progress" && (
            <span className="text-[10px] text-amber-700">on route</span>
          )}
        </div>
      </div>
    </div>
  );
}
