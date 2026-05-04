"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import type { CollectorPeriodRange } from "@/lib/collector-period";

const RANGES: Array<{ key: CollectorPeriodRange; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export function RangeBar({
  current,
  userId,
  anchor,
}: {
  current: CollectorPeriodRange;
  userId: number;
  anchor: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
      <Calendar className="ms-1 size-3.5 text-muted-foreground" />
      {RANGES.map((r) => {
        const isActive = current === r.key;
        const href = `/collectors/${userId}?range=${r.key}${
          anchor ? `&date=${anchor}` : ""
        }`;
        return (
          <Link
            key={r.key}
            href={href}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
