export const ASSIGNMENT_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "reassigned",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const FAILURE_REASONS = [
  "customer_not_home",
  "refused",
  "partial_payment",
  "dispute",
  "other",
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

export type CollectorAssignment = {
  id: number;
  collector_user_id: number;
  invoice_id: string;
  assigned_by: number | null;
  assigned_at: string | null;
  status: AssignmentStatus;
  completed_at: string | null;
  failure_reason: FailureReason | null;
  priority: number;
  zone: string | null;
  route_order: number | null;
  collector?: { id: number; name: string } | null;
  invoice?: {
    id: string;
    number: string;
    total: number;
    balance_due: number;
    due_at: string | null;
    service_category?: { id: string | number; name: string } | null;
    customer: {
      id: string;
      code: string;
      full_name: string;
      phone_primary: string | null;
      whatsapp_phone: string | null;
      city: string | null;
      address_line: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
  } | null;
  created_at: string | null;
};
