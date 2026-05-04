import "server-only";
import { apiFetch } from "@/lib/api";

export type CollectorPeriodRange =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "year";

type CustomerRef = { id: string; code: string; full_name: string } | null;
type InvoiceRef = {
  id: string;
  number: string;
  total?: number | null;
  balance_due?: number | null;
  status?: string;
} | null;

export type PaymentEntry = {
  id: string;
  kind: "payment";
  when: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  notes: string | null;
  reference_number: string | null;
  cleared: boolean;
  invoice: InvoiceRef;
  customer: CustomerRef;
};

export type FailureEntry = {
  id: string;
  kind: "failure";
  when: string | null;
  failure_reason: string | null;
  failure_notes: string | null;
  invoice: { id: string; number: string; balance_due: number } | null;
  customer: CustomerRef;
};

export type HandoverEntry = {
  id: string;
  kind: "handover";
  when: string | null;
  handover_id: number;
  amount: number;
  currency: string;
  status: string;
  notes: string | null;
  dispute_reason: string | null;
};

export type AuditEntry = {
  id: string;
  kind: "audit";
  when: string | null;
  action: string;
  subject_label: string | null;
  changes: Record<string, unknown> | null;
};

export type TimelineEntry =
  | PaymentEntry
  | FailureEntry
  | HandoverEntry
  | AuditEntry;

export type CollectorPeriod = {
  collector: { id: number; name: string; email: string };
  range: CollectorPeriodRange;
  anchor: string;
  window: { start: string; end: string; bucket: string };
  kpis: {
    collected: number;
    currency: string;
    visits: number;
    completed: number;
    failed: number;
    pending: number;
    success_rate: number | null;
    avg_per_active_day: number;
    disputes: number;
  };
  series: Array<{ date: string; amount: number; count: number }>;
  method_breakdown: Record<string, { count: number; total: number }>;
  top_customers: Array<{
    customer_id: string;
    customer: { id: string; code: string; full_name: string } | null;
    visits: number;
    collected: number;
  }>;
  handovers: {
    summary: {
      count: number;
      pending: number;
      confirmed: number;
      disputed: number;
      declared_total: number;
    };
    recent: Array<{
      id: number;
      amount: number;
      status: string;
      handed_over_at: string | null;
      dispute_reason: string | null;
    }>;
  };
  best_day: { date: string; amount: number; count: number } | null;
  worst_day: { date: string; amount: number; count: number } | null;
  timeline: TimelineEntry[];
  route: {
    started_at: string | null;
    ended_at: string | null;
    last_ping_at: string | null;
    last_latitude: number | null;
    last_longitude: number | null;
    gps_track: Array<{ lat: number; lng: number; at: string }>;
    total_collected: number;
  } | null;
};

export async function getCollectorPeriod(
  userId: number,
  range: CollectorPeriodRange = "today",
  date?: string,
): Promise<CollectorPeriod> {
  const qs = new URLSearchParams({ range });
  if (date) qs.set("date", date);
  const res = await apiFetch<{ data: CollectorPeriod }>(
    `/api/v1/collectors/${userId}/period?${qs.toString()}`,
  );
  return res.data;
}
