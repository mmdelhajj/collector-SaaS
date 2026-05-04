"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmHandoverAction,
  disputeHandoverAction,
} from "@/app/(dashboard)/collectors/handover-actions";

export function HandoverRowActions({
  id,
  amount,
  collectorName,
}: {
  id: number;
  amount: number;
  collectorName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const res = await confirmHandoverAction(id);
      if (res.ok) {
        toast.success("Cash confirmed received", {
          description: `$${amount.toFixed(2)} from ${collectorName}`,
        });
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not confirm.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        onClick={confirm}
        disabled={isPending}
        className="h-7 px-2 text-xs"
      >
        {isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <CheckCircle2 className="size-3" />
        )}
        Confirm
      </Button>
      <DisputeDialog
        id={id}
        amount={amount}
        collectorName={collectorName}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function DisputeDialog({
  id,
  amount,
  collectorName,
  onDone,
}: {
  id: number;
  amount: number;
  collectorName: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await disputeHandoverAction(id, reason);
      if (res.ok) {
        toast.success("Marked disputed", {
          description: "The collector will be notified.",
        });
        setOpen(false);
        setReason("");
        onDone();
      } else {
        toast.error(res.error ?? "Could not dispute.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium text-red-700 hover:bg-red-50 hover:text-red-800"
        title="Dispute"
      >
        <XCircle className="size-3" />
        Dispute
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispute this handover?</DialogTitle>
          <DialogDescription>
            <span className="font-mono">${amount.toFixed(2)}</span> from{" "}
            {collectorName}. Your reason will be saved on the record and shared
            with the collector.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="dispute-reason">Reason</Label>
          <Textarea
            id="dispute-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Counted only $190 in the envelope; collector reported $200."
            autoFocus
          />
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            <span>Disputes appear in the audit log and reports.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit dispute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
