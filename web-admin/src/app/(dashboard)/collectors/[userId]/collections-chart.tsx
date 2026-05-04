"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CollectorPeriodRange } from "@/lib/collector-period";

type Series = Array<{ date: string; amount: number; count: number }>;

export function CollectionsChart({
  series,
  userId,
  range,
}: {
  series: Series;
  userId: number;
  range: CollectorPeriodRange;
}) {
  const router = useRouter();

  // For year view, roll up daily into monthly to avoid 365 unreadable bars.
  const data = useMemo(() => {
    if (range !== "year") {
      return series.map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
        }),
      }));
    }
    const byMonth = new Map<string, { date: string; amount: number; count: number }>();
    for (const d of series) {
      const monthKey = d.date.slice(0, 7); // YYYY-MM
      const cur = byMonth.get(monthKey) ?? { date: monthKey + "-01", amount: 0, count: 0 };
      cur.amount += d.amount;
      cur.count += d.count;
      byMonth.set(monthKey, cur);
    }
    return Array.from(byMonth.values()).map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      }),
    }));
  }, [series, range]);

  function handleClick(entry: { date: string; amount: number }) {
    if (entry.amount <= 0) return;
    if (range === "year") {
      // Drop into the month view.
      router.push(`/collectors/${userId}?range=month&date=${entry.date}`);
    } else {
      router.push(`/collectors/${userId}?range=today&date=${entry.date}`);
    }
  }

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data in this period.
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
              border: "1px solid hsl(var(--border))",
            }}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [`$${n.toFixed(2)}`, "Collected"] as [string, string];
            }}
          />
          <Bar
            dataKey="amount"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            onClick={(_e, idx) => handleClick(data[idx])}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
