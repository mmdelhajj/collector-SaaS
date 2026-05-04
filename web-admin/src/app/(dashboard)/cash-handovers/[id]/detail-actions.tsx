"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  confirmHandoverAction,
  disputeHandoverAction,
  resolveHandoverAction,
} from "../actions";

export function HandoverDetailActions({
  id,
  status,
  declaredAmount,
  systemAmount,
}: {
  id: number;
  status: "pending" | "confirmed" | "disputed";
  declaredAmount: number;
  systemAmount: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const res = await confirmHandoverAction(id);
      if (res.ok) toast.success("Confirmed");
      else toast.error(res.error ?? "Could not confirm");
    });
  }

  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
        <ShieldCheck className="size-4" />
        Confirmed and reconciled. No further action needed.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
      <p className="me-auto text-sm font-medium">
        {status === "pending"
          ? "Count the cash, then choose:"
          : "This handover is disputed. Resolve when settled:"}
      </p>

      {status === "pending" && (
        <>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Confirm
          </Button>
          <DisputeButton id={id} />
        </>
      )}

      {status === "disputed" && (
        <ResolveButton
          id={id}
          declaredAmount={declaredAmount}
          systemAmount={systemAmount}
        />
      )}
    </div>
  );
}

function DisputeButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    startTransition(async () => {
      const res = await disputeHandoverAction(id, reason);
      if (res.ok) {
        toast.success("Flagged");
        setOpen(false);
      } else toast.error(res.error ?? "Could not flag");
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-300 bg-background px-3 text-sm font-medium text-rose-700 hover:bg-rose-50">
        <ShieldAlert className="size-4" />
        Dispute
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Flag a discrepancy</SheetTitle>
          <SheetDescription>
            The collector&rsquo;s manager will be notified. The reason becomes
            permanent on the audit trail.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="d-reason">Reason</Label>
            <Textarea
              id="d-reason"
              rows={6}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Counted $25 short. Cash bundle is in safe pending review."
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="border-rose-300 bg-rose-600 text-white hover:bg-rose-700"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Flag dispute"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ResolveButton({
  id,
  declaredAmount,
  systemAmount,
}: {
  id: number;
  declaredAmount: number;
  systemAmount: number;
}) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [finalAmount, setFinalAmount] = useState(declaredAmount.toFixed(2));
  const [adjustAmount, setAdjustAmount] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!resolution.trim()) {
      toast.error("Tell me how it was resolved");
      return;
    }
    startTransition(async () => {
      const res = await resolveHandoverAction(
        id,
        resolution,
        adjustAmount ? Number(finalAmount) : undefined,
      );
      if (res.ok) {
        toast.success("Resolved + confirmed");
        setOpen(false);
      } else toast.error(res.error ?? "Could not resolve");
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
        <Wrench className="size-4" />
        Mark resolved
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Resolve dispute</SheetTitle>
          <SheetDescription>
            Document what happened. The handover then flips to confirmed and
            the resolution is appended to the audit trail.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="rounded-lg border bg-muted/20 p-3 text-xs">
            <p>
              Declared:{" "}
              <span className="font-mono font-semibold">
                ${declaredAmount.toFixed(2)}
              </span>
            </p>
            <p>
              System:{" "}
              <span className="font-mono font-semibold">
                ${systemAmount.toFixed(2)}
              </span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-resolution">What happened?</Label>
            <Textarea
              id="r-resolution"
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Collector deposited the missing $25. All accounted for."
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.checked)}
              className="size-4 rounded border"
            />
            Adjust the final amount on this handover
          </label>

          {adjustAmount && (
            <div className="space-y-1.5">
              <Label htmlFor="r-final">Final amount</Label>
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="r-final"
                  type="number"
                  step="0.01"
                  min="0"
                  value={finalAmount}
                  onChange={(e) => setFinalAmount(e.target.value)}
                  className="ps-7 font-mono"
                />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Resolve + confirm"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
