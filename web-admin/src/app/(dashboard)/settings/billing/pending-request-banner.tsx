"use client";

import { useTransition } from "react";
import { Hourglass, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LocalDateTime } from "@/components/ui/local-datetime";
import type { PendingPlanRequest } from "@/lib/settings";
import { cancelPlanRequestAction } from "./actions";

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

/**
 * Renders the "your plan-change request is awaiting super-admin review"
 * banner. Hides itself once the request is decided (page refetches).
 */
export function PendingRequestBanner({
  request,
}: {
  request: PendingPlanRequest;
}) {
  const [isPending, startTransition] = useTransition();

  const requestedPrice = request.requested_plan
    ? request.requested_period === "annual" &&
      request.requested_plan.price_annual !== null
      ? FORMAT_MONEY(request.requested_plan.price_annual) + "/yr"
      : FORMAT_MONEY(request.requested_plan.price_monthly) + "/mo"
    : null;

  function handleCancel() {
    if (!confirm("Cancel your pending plan change request?")) return;
    startTransition(async () => {
      const res = await cancelPlanRequestAction(request.id);
      if (res.ok) {
        toast.success("Request cancelled");
      } else {
        toast.error(res.error ?? "Could not cancel");
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
            <Hourglass className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Plan change pending super-admin approval
            </h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">
              You requested:{" "}
              <strong>
                {request.requested_plan?.name ?? "—"} /{" "}
                {request.requested_period}
              </strong>
              {requestedPrice && (
                <span className="ms-1 text-xs">({requestedPrice})</span>
              )}
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Submitted <LocalDateTime iso={request.created_at} /> by{" "}
              {request.requested_by ?? "you"}. Your current plan stays active
              until a super-admin approves the change.
            </p>
            {request.requester_note && (
              <p className="mt-2 rounded-md bg-white/60 px-3 py-1.5 text-xs italic text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                &ldquo;{request.requester_note}&rdquo;
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
          className="border-amber-300 hover:bg-amber-100 dark:border-amber-900 dark:hover:bg-amber-950/40"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          Cancel request
        </Button>
      </div>
    </div>
  );
}
