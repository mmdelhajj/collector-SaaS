import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type {
  AssignmentStatus,
  CollectorAssignment,
  FailureReason,
} from "@/lib/collectors-types";

export type {
  AssignmentStatus,
  CollectorAssignment,
  FailureReason,
} from "@/lib/collectors-types";
export { ASSIGNMENT_STATUSES, FAILURE_REASONS } from "@/lib/collectors-types";

export type AssignmentListParams = {
  page?: number;
  perPage?: number;
  status?: AssignmentStatus;
  collectorUserId?: number;
  date?: string;
  zone?: string;
};

export async function listAssignments(
  params: AssignmentListParams = {},
): Promise<Paginated<CollectorAssignment>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.status) qs.set("filter[status]", params.status);
  if (params.collectorUserId)
    qs.set("filter[collector_user_id]", String(params.collectorUserId));
  if (params.date) qs.set("filter[date]", params.date);
  if (params.zone) qs.set("filter[zone]", params.zone);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<CollectorAssignment>>(
    `/api/v1/collector-assignments${suffix}`,
  );
}

export type UpdateAssignmentPayload = Partial<{
  status: AssignmentStatus;
  failure_reason: FailureReason | null;
  failure_notes: string | null;
  priority: number;
  route_order: number | null;
}>;

export async function updateAssignment(
  id: number,
  payload: UpdateAssignmentPayload,
): Promise<{ data: CollectorAssignment }> {
  return apiFetch<{ data: CollectorAssignment }>(
    `/api/v1/collector-assignments/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export type BulkAssignPayload = {
  collector_user_id: number;
  invoice_ids: string[];
  priority?: number;
  zone?: string;
  /** When true, invoice_ids array order becomes route_order on each assignment. */
  use_order?: boolean;
};

export async function bulkAssign(
  payload: BulkAssignPayload,
): Promise<{ assigned: number; skipped: number; message: string }> {
  return apiFetch<{ assigned: number; skipped: number; message: string }>(
    "/api/v1/collector-assignments/bulk-assign",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
