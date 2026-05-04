"use client";

import { cn } from "@/lib/utils";
import type { AgingReport } from "@/lib/reports";

const BUCKETS: {
  key: keyof AgingReport["buckets"];
  label: string;
  color: string;
}[] = [
  { key: "current", label: "Current", color: "bg-emerald-500" },
  { key: "1_30", label: "1–30 d", color: "bg-amber-500" },
  { key: "31_60", label: "31–60 d", color: "bg-orange-500" },
  { key: "61_90", label: "61–90 d", color: "bg-red-500" },
  { key: "90_plus", label: "90+ d", color: "bg-red-700" },
];

function formatMoney(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function AgingBars({ report }: { report: AgingReport }) {
  const max = Math.max(1, ...BUCKETS.map((b) => report.buckets[b.key]));

  return (
    <div className="space-y-3">
      {BUCKETS.map((b) => {
        const value = report.buckets[b.key];
        const pct = max > 0 ? (value / max) * 100 : 0;
        return (
          <div key={b.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground/80">{b.label}</span>
              <span className="tabular-nums text-foreground">
                {formatMoney(value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", b.color)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
