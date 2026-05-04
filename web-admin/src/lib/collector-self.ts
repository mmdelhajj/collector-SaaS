import "server-only";
import { apiFetch } from "@/lib/api";
import type { CollectorAssignment } from "@/lib/collectors-types";

export type MyStats = {
  today: { collected: number; assignments: Record<string, number> };
  this_week: { collected: number; assignments: Record<string, number> };
  this_month: { collected: number; assignments: Record<string, number> };
};

export async function listMyAssignments(): Promise<CollectorAssignment[]> {
  const res = await apiFetch<{ data: CollectorAssignment[] }>(
    "/api/v1/collector/my-assignments",
  );
  return res.data;
}

export async function getMyStats(): Promise<MyStats> {
  return apiFetch<MyStats>("/api/v1/collector/my-stats");
}

export type MyPayment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  collected_at: string | null;
  reference_number: string | null;
  notes: string | null;
  /** "in_hand" = physical cash collector carries (needs handover).
   *  "direct"  = mobile money / card → went straight to company wallet. */
  routing: "in_hand" | "direct";
  handed_over: boolean;
  invoice: { id: string; number: string } | null;
  customer: { id: string; code: string; full_name: string } | null;
};

export type MyPaymentsResponse = {
  rows: MyPayment[];
  totals: { in_hand: number; direct: number; all: number };
  handover_methods: string[];
};

export async function listMyPayments(): Promise<MyPaymentsResponse> {
  const res = await apiFetch<{
    data: MyPayment[];
    totals: { in_hand: number; direct: number; all: number };
    handover_methods: string[];
  }>("/api/v1/collector/my-payments");
  return {
    rows: res.data,
    totals: res.totals,
    handover_methods: res.handover_methods,
  };
}

export type PendingCash = {
  expected_amount: number;
  currency: string;
  count: number;
  breakdown_by_method?: Record<string, { count: number; total: number }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    collected_at: string | null;
    customer: { code: string; full_name: string } | null;
    invoice: { number: string } | null;
  }>;
};

export async function getPendingCash(): Promise<PendingCash> {
  const res = await apiFetch<{ data: PendingCash }>(
    "/api/v1/collector/pending-cash",
  );
  return res.data;
}

export type SupervisorOption = { id: number; name: string };

export async function listSupervisors(): Promise<SupervisorOption[]> {
  const res = await apiFetch<{
    data: Array<{ id: number; name: string; roles: string[] }>;
  }>("/api/v1/users?per_page=100");
  return res.data
    .filter((u) =>
      ["tenant_owner", "tenant_admin", "manager", "accountant"].some((r) =>
        u.roles.includes(r),
      ),
    )
    .map((u) => ({ id: u.id, name: u.name }));
}

export async function submitHandover(payload: {
  to_user_id: number;
  amount: number;
  notes?: string;
}): Promise<void> {
  await apiFetch("/api/v1/collector/handover-cash", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
