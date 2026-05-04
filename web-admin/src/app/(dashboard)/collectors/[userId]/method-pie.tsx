"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const METHOD_COLORS: Record<string, string> = {
  cash: "#10b981", // emerald
  whish: "#0ea5e9", // sky
  omt: "#f59e0b", // amber
  areeba: "#8b5cf6", // violet
  card: "#ec4899", // pink
  bank_transfer: "#6366f1", // indigo
  stripe: "#14b8a6", // teal
  other: "#94a3b8", // slate
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  whish: "Whish",
  omt: "OMT",
  areeba: "Areeba",
  card: "Card",
  bank_transfer: "Bank",
  stripe: "Stripe",
  other: "Other",
};

export function MethodPie({
  breakdown,
}: {
  breakdown: Record<string, { count: number; total: number }>;
}) {
  const data = Object.entries(breakdown).map(([method, info]) => ({
    name: METHOD_LABELS[method] ?? method,
    value: info.total,
    count: info.count,
    color: METHOD_COLORS[method] ?? "#94a3b8",
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No payments yet.
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
              border: "1px solid hsl(var(--border))",
            }}
            formatter={(value, _name, item) => {
              const v = typeof value === "number" ? value : Number(value);
              const pct = total > 0 ? ((v / total) * 100).toFixed(0) : "0";
              const payload = item.payload as { count: number; name: string };
              return [
                `$${v.toFixed(2)} (${pct}% · ${payload.count})`,
                payload.name,
              ] as [string, string];
            }}
          />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value, entry) => {
              const v = (entry.payload as { value: number } | undefined)?.value ?? 0;
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return `${value} ${pct}%`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
