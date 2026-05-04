"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { CashHandover } from "@/lib/handovers-types";
import { confirmHandoverAction, disputeHandoverAction } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400",
  confirmed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400",
  disputed:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400",
};

export function HandoversTable({ rows }: { rows: CashHandover[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
        <p className="text-sm font-medium">Nothing here.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Handovers appear when collectors submit their daily cash.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Collector</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-left">Submitted</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((h) => (
            <tr key={h.id} className="hover:bg-muted/20">
              <td className="px-4 py-3">
                <div className="font-medium">{h.collector?.name ?? "—"}</div>
                {h.notes && (
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {h.notes}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                <div>${Number(h.amount).toLocaleString()}</div>
                {h.system_amount != null &&
                  Math.abs(Number(h.amount) - h.system_amount) > 0.01 && (
                    <div className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      ⚠ system $${h.system_amount.toFixed(2)}
                    </div>
                  )}
                <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                  {h.payments?.length ?? 0} payment{(h.payments?.length ?? 0) === 1 ? "" : "s"}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <LocalDateTime iso={h.handed_over_at} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    STATUS_STYLES[h.status] ?? ""
                  }`}
                >
                  {h.status}
                </span>
                {h.status === "disputed" && h.dispute_reason && (
                  <div className="mt-1 text-xs text-rose-700">
                    {h.dispute_reason}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <a
                    href={`/cash-handovers/${h.id}`}
                    className="inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    Open
                  </a>
                  {h.status === "pending" && <RowActions handover={h} />}
                  {h.status !== "pending" && (
                    <span className="text-xs text-muted-foreground">
                      {h.supervisor?.name ?? "—"}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({ handover }: { handover: CashHandover }) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const res = await confirmHandoverAction(handover.id);
      if (res.ok) toast.success("Confirmed");
      else toast.error(res.error ?? "Could not confirm");
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleConfirm}
        disabled={isPending}
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        Confirm
      </Button>
      <DisputeButton handoverId={handover.id} />
    </div>
  );
}

function DisputeButton({ handoverId }: { handoverId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    startTransition(async () => {
      const res = await disputeHandoverAction(handoverId, reason);
      if (res.ok) {
        toast.success("Flagged");
        setOpen(false);
        setReason("");
      } else {
        toast.error(res.error ?? "Could not flag");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-300 bg-background px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
        <ShieldAlert className="size-3.5" />
        Dispute
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Flag a discrepancy</SheetTitle>
          <SheetDescription>
            Use this when the cash count doesn&rsquo;t match what was logged.
            The collector&rsquo;s manager will be notified.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="dispute-reason">Reason</Label>
            <Textarea
              id="dispute-reason"
              rows={6}
              placeholder="Short under by $25 in the morning batch…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button
            type="button"
            variant="outline"
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Flagging…
              </>
            ) : (
              "Flag discrepancy"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
