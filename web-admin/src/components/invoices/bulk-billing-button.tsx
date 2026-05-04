"use client";

import { useState, useTransition } from "react";
import { Calendar, Loader2 } from "lucide-react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { runBulkBillingAction } from "@/app/(dashboard)/invoices/actions";

export function BulkBillingButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await runBulkBillingAction();
      if (res.ok && res.result) {
        toast.success(
          `Generated ${res.result.generated} invoice${res.result.generated === 1 ? "" : "s"}`,
          {
            description:
              res.result.generated === 0
                ? "All active subscriptions already have an invoice for this period."
                : `Total billed: $${res.result.total_amount.toFixed(2)} · ${res.result.skipped} skipped`,
          },
        );
        setOpen(false);
      } else {
        toast.error("Billing run failed", {
          description: res.error ?? "Try again or check the server logs.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
        <Calendar className="size-4" />
        Run monthly billing
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate this month&rsquo;s invoices</DialogTitle>
          <DialogDescription>
            One invoice per active subscription, dated{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            . Idempotent — running twice in the same month is safe.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">What this does:</p>
          <ul className="mt-1.5 space-y-1 list-inside list-disc">
            <li>Reads every active subscription for your tenant</li>
            <li>
              Creates an invoice if one doesn&rsquo;t exist for the current
              period
            </li>
            <li>Status: <span className="font-mono">open</span>, due in 15 days</li>
            <li>Skips subscriptions already billed this period</li>
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </DialogClose>
          <Button onClick={run} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Running…
              </>
            ) : (
              "Run billing now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
