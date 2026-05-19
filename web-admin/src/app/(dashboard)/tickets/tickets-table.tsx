"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, PlayCircle, XCircle } from "lucide-react";
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
import type {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/lib/tickets-types";
import { cn } from "@/lib/utils";
import { updateTicketAction } from "./actions";

const TYPE_STYLES: Record<TicketType, string> = {
  install: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  repair: "bg-amber-50 text-amber-700 ring-amber-600/20",
  disconnect: "bg-rose-50 text-rose-700 ring-rose-600/20",
  support: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "text-zinc-600",
  normal: "text-zinc-700",
  high: "text-amber-700 font-semibold",
  urgent: "text-rose-700 font-semibold",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-600/20",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-600/20",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-zinc-100 text-zinc-500 ring-zinc-600/20",
};

export function TicketsTable({ rows }: { rows: Ticket[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
        <p className="text-sm font-medium">No tickets in this view.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click <span className="font-semibold">New ticket</span> to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Ticket</th>
            <th className="px-4 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Priority</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Scheduled</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-muted/20">
              <td className="px-4 py-3">
                <div className="font-mono text-xs text-muted-foreground">
                  {t.number}
                </div>
                <div className="font-medium">{t.title}</div>
              </td>
              <td className="px-4 py-3">
                {t.customer ? (
                  <>
                    <div>{t.customer.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.customer.code}
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize",
                    TYPE_STYLES[t.type],
                  )}
                >
                  {t.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "text-xs capitalize",
                    PRIORITY_STYLES[t.priority],
                  )}
                >
                  {t.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset capitalize",
                    STATUS_STYLES[t.status],
                  )}
                >
                  {t.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {t.scheduled_at
                  ? new Date(t.scheduled_at).toLocaleString()
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <TicketRowActions ticket={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketRowActions({ ticket }: { ticket: Ticket }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function transition(status: TicketStatus, label: string) {
    startTransition(async () => {
      const res = await updateTicketAction(ticket.id, { status });
      if (res.ok) {
        toast.success(label);
        setOpen(false);
      } else {
        toast.error(res.error ?? "Could not update");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted">
        Manage
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{ticket.number}</SheetTitle>
          <SheetDescription>{ticket.title}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          {ticket.description && (
            <p className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
              {ticket.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Detail
              label="Customer"
              value={ticket.customer?.full_name ?? "—"}
            />
            <Detail label="Code" value={ticket.customer?.code ?? "—"} />
            <Detail
              label="Phone"
              value={ticket.customer?.phone_primary ?? "—"}
            />
            <Detail label="City" value={ticket.customer?.city ?? "—"} />
            <Detail
              label="Address"
              value={ticket.customer?.address_line ?? "—"}
              full
            />
            <Detail
              label="Assigned"
              value={ticket.assigned_to?.name ?? "Unassigned"}
            />
            <Detail
              label="Scheduled"
              value={
                ticket.scheduled_at
                  ? new Date(ticket.scheduled_at).toLocaleString()
                  : "—"
              }
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status transitions
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending || ticket.status === "in_progress"}
                onClick={() => transition("in_progress", "Marked in progress")}
              >
                <PlayCircle className="size-4" />
                Start
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || ticket.status === "done"}
                onClick={() => transition("done", "Marked done")}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle2 className="size-4" />
                Done
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || ticket.status === "cancelled"}
                onClick={() => transition("cancelled", "Cancelled")}
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="size-4" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || ticket.status === "open"}
                onClick={() => transition("open", "Reopened")}
              >
                Reopen
              </Button>
            </div>
            {isPending && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Updating…
              </p>
            )}
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Close
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={cn(full && "col-span-2")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
