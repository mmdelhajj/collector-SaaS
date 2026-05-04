"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { approvePlanRequestAction, rejectPlanRequestAction } from "./actions";

export function DecideButtons({
  requestId,
  tenantName,
  planName,
  period,
}: {
  requestId: number;
  tenantName: string;
  planName: string;
  period: string;
}) {
  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const res = await approvePlanRequestAction(requestId, note);
      if (res.ok) {
        toast.success(`${tenantName} → ${planName}/${period} approved`);
        setOpenApprove(false);
        setNote("");
      } else {
        toast.error(res.error ?? "Could not approve");
      }
    });
  }

  function reject() {
    if (!note.trim()) {
      toast.error("A reason is required to reject");
      return;
    }
    startTransition(async () => {
      const res = await rejectPlanRequestAction(requestId, note);
      if (res.ok) {
        toast.success(`${tenantName} request rejected`);
        setOpenReject(false);
        setNote("");
      } else {
        toast.error(res.error ?? "Could not reject");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogTrigger
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm transition-opacity hover:bg-emerald-700"
          aria-label="Approve"
        >
          <Check className="size-4" />
          Approve
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve plan change?</DialogTitle>
            <DialogDescription>
              <strong>{tenantName}</strong> will be moved to{" "}
              <strong>
                {planName} / {period}
              </strong>
              . This is applied immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">Note (optional)</label>
            <Textarea
              rows={3}
              placeholder="Internal note for the audit log…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenApprove(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={approve}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Confirm approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogTrigger
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          aria-label="Reject"
        >
          <X className="size-4" />
          Reject
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject plan change?</DialogTitle>
            <DialogDescription>
              <strong>{tenantName}</strong> will stay on their current plan. The
              reason below is shared with the tenant admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="Why this can't be approved…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenReject(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={reject}
              disabled={isPending || !note.trim()}
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
