import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";
import type { TenantInfo } from "@/lib/auth";

export function TrialBanner({ tenant }: { tenant: TenantInfo }) {
  // Don't render for paid/active subscriptions or if tenant info missing.
  if (!tenant.trial_ends_at || !["trial"].includes(tenant.status)) {
    return null;
  }

  const ends = new Date(tenant.trial_ends_at);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (daysLeft === 0) {
    return (
      <div className="border-b border-rose-300 bg-rose-50/80 px-4 py-2 text-sm dark:border-rose-900 dark:bg-rose-950/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-medium text-rose-900 dark:text-rose-300">
            <Clock className="size-4" />
            Your trial has ended. Your workspace is read-only until you choose a
            plan.
          </p>
          <Link
            href="/settings/billing"
            className="inline-flex h-8 items-center rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Choose a plan
          </Link>
        </div>
      </div>
    );
  }

  const urgent = daysLeft <= 3;

  return (
    <div
      className={`border-b px-4 py-2 text-sm ${
        urgent
          ? "border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40"
          : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p
          className={`flex items-center gap-2 ${
            urgent
              ? "font-medium text-amber-900 dark:text-amber-300"
              : "text-foreground/80"
          }`}
        >
          <Sparkles className="size-4 text-primary" />
          <span>
            <span className="font-semibold">
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </span>{" "}
            in your free trial. Upgrade anytime to keep going past day 14.
          </span>
        </p>
        <Link
          href="/settings/billing"
          className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold transition-opacity hover:opacity-90 ${
            urgent
              ? "bg-amber-600 text-white"
              : "bg-primary text-primary-foreground"
          }`}
        >
          Upgrade now
        </Link>
      </div>
    </div>
  );
}
