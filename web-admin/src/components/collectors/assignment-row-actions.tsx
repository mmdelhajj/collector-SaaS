"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
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
import { updateAssignmentStatusAction } from "@/app/(dashboard)/collectors/actions";
import type { AssignmentStatus, FailureReason } from "@/lib/collectors-types";

const FAILURE_REASONS: { value: FailureReason; label: string; hint: string }[] =
  [
    {
      value: "customer_not_home",
      label: "Customer not home",
      hint: "Nobody answered. Try again later.",
    },
    {
      value: "refused",
      label: "Refused to pay",
      hint: "Customer is home but refuses to settle the invoice.",
    },
    {
      value: "partial_payment",
      label: "Partial payment only",
      hint: "Customer paid less than the full balance.",
    },
    {
      value: "dispute",
      label: "Dispute / billing issue",
      hint: "Customer contests the invoice — escalate to support.",
    },
    {
      value: "other",
      label: "Other",
      hint: "Any reason not covered above — please describe below.",
    },
  ];

export function AssignmentRowActions({
  id,
  currentStatus,
}: {
  id: number;
  currentStatus: AssignmentStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(
    status: AssignmentStatus,
    reason?: FailureReason,
    notes?: string,
  ) {
    startTransition(async () => {
      const res = await updateAssignmentStatusAction(id, status, reason, notes);
      if (res.ok) {
        toast.success(
          status === "completed"
            ? "Marked done"
            : status === "in_progress"
              ? "Marked on route"
              : status === "failed"
                ? "Marked failed"
                : "Updated",
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not update.");
      }
    });
  }

  if (currentStatus === "completed" || currentStatus === "reassigned") {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {currentStatus === "pending" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setStatus("in_progress")}
          disabled={isPending}
          className="h-7 px-2 text-xs"
        >
          {isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          Start
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setStatus("completed")}
        disabled={isPending}
        className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
      >
        <CheckCircle2 className="size-3" />
        Done
      </Button>
      <FailDialog
        onPick={(reason, notes) => setStatus("failed", reason, notes)}
        disabled={isPending}
      />
    </div>
  );
}

function FailDialog({
  onPick,
  disabled,
}: {
  onPick: (reason: FailureReason, notes?: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FailureReason>("customer_not_home");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const otherChosen = selected === "other";
  const otherInvalid = otherChosen && notes.trim().length === 0;

  function submit() {
    if (otherInvalid) {
      setTouched(true);
      return;
    }
    onPick(selected, notes);
    setOpen(false);
    // Reset for next time the dialog opens.
    setSelected("customer_not_home");
    setNotes("");
    setTouched(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSelected("customer_not_home");
          setNotes("");
          setTouched(false);
        }
      }}
    >
      <DialogTrigger
        className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
      >
        <XCircle className="size-3" />
        Fail
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why did this collection fail?</DialogTitle>
          <DialogDescription>
            Pick the closest reason. Saved on the assignment and surfaced in the
            collector-performance report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {FAILURE_REASONS.map((r) => {
            const isSelected = selected === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelected(r.value)}
                className={
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors " +
                  (isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/40")
                }
              >
                <span
                  className={
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border " +
                    (isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40")
                  }
                  aria-hidden
                >
                  {isSelected && (
                    <span className="size-1.5 rounded-full bg-primary-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <Label className="cursor-pointer text-sm font-medium">
                    {r.label}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Notes textarea — required when "Other", optional otherwise. */}
        <div className="space-y-1.5">
          <Label htmlFor="failure-notes" className="text-sm">
            {otherChosen ? (
              <>
                Describe what happened
                <span className="ms-0.5 text-destructive">*</span>
              </>
            ) : (
              <>
                Notes <span className="text-muted-foreground">(optional)</span>
              </>
            )}
          </Label>
          <Textarea
            id="failure-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={
              otherChosen
                ? "e.g. Address turned out to be wrong — building demolished."
                : "Any extra context to share with the team."
            }
            aria-invalid={touched && otherInvalid}
            className={touched && otherInvalid ? "border-destructive" : ""}
          />
          {touched && otherInvalid && (
            <p className="text-xs text-destructive">
              Please describe what happened so the team has context.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={submit}>
            <XCircle className="size-4" />
            Mark failed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
