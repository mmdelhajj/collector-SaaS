import "server-only";
import { apiFetch } from "@/lib/api";

export type CollectorTodayRow = {
  id: number;
  name: string;
  collected_today: number;
  completed: number;
  total: number;
  progress: number;
  status: "on-route" | "done" | "not-started";
};

export type ActivityRow = {
  id: number;
  action: string;
  subject_label: string | null;
  user_name: string | null;
  created_at: string | null;
  changes: Record<string, unknown> | null;
};

export type DashboardReport = {
  collected_today: number;
  collected_this_month: number;
  collected_last_month: number;
  mom_change_pct: number | null;
  total_outstanding: number;
  overdue_outstanding: number;
  active_customers: number;
  suspended_customers: number;
  open_invoices: number;
  overdue_30_plus: number;
  collectors_today: CollectorTodayRow[];
  recent_activity: ActivityRow[];
  backup: {
    last_success_at: string | null;
    age_hours: number | null;
    status: "healthy" | "stale" | "failing" | "unknown";
  };
};

export type AgingReport = {
  buckets: {
    current: number;
    "1_30": number;
    "31_60": number;
    "61_90": number;
    "90_plus": number;
  };
  total: number;
  invoice_count: number;
};

export type CollectorPerformanceRow = {
  user_id: number;
  name: string;
  collected: number;
  assignments_total: number;
  assignments_completed: number;
  assignments_failed: number;
  success_rate: number | null;
};

export type RevenueRow = {
  category_id: string | null;
  category_name: string;
  billed: number;
  collected: number;
  collection_rate: number | null;
};

export async function getDashboardReport(): Promise<DashboardReport> {
  return apiFetch<DashboardReport>("/api/v1/reports/dashboard");
}

export async function getAgingReport(): Promise<AgingReport> {
  return apiFetch<AgingReport>("/api/v1/reports/aging");
}

export async function getCollectorPerformance(): Promise<{
  since: string;
  data: CollectorPerformanceRow[];
}> {
  return apiFetch<{ since: string; data: CollectorPerformanceRow[] }>(
    "/api/v1/reports/collector-performance",
  );
}

export async function getRevenueReport(): Promise<{
  since: string;
  data: RevenueRow[];
}> {
  return apiFetch<{ since: string; data: RevenueRow[] }>(
    "/api/v1/reports/revenue",
  );
}
