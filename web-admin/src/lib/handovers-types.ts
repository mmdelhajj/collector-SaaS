export const HANDOVER_STATUSES = ["pending", "confirmed", "disputed"] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];

export type CashHandover = {
  id: number;
  amount: number;
  currency: string;
  status: HandoverStatus;
  notes: string | null;
  collector_route_id: number | null;
  handed_over_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  photo_path: string | null;
  collector?: { id: number; name: string } | null;
  supervisor?: { id: number; name: string } | null;
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    collected_at: string | null;
    notes: string | null;
    reference_number: string | null;
    customer: { code: string; full_name: string } | null;
    invoice: { number: string } | null;
  }>;
  system_amount?: number;
  created_at: string | null;
};
