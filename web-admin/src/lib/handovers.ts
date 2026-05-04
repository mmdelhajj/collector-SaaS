import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type { CashHandover, HandoverStatus } from "@/lib/handovers-types";

export type { CashHandover, HandoverStatus } from "@/lib/handovers-types";
export { HANDOVER_STATUSES } from "@/lib/handovers-types";

export type HandoverListParams = {
  page?: number;
  perPage?: number;
  status?: HandoverStatus;
};

export async function listHandovers(
  params: HandoverListParams = {},
): Promise<Paginated<CashHandover>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.status) qs.set("filter[status]", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<CashHandover>>(`/api/v1/cash-handovers${suffix}`);
}

export async function confirmHandover(
  id: number,
): Promise<{ data: CashHandover }> {
  return apiFetch<{ data: CashHandover }>(
    `/api/v1/cash-handovers/${id}/confirm`,
    { method: "POST" },
  );
}

export async function disputeHandover(
  id: number,
  reason: string,
): Promise<{ data: CashHandover }> {
  return apiFetch<{ data: CashHandover }>(
    `/api/v1/cash-handovers/${id}/dispute`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}

export async function resolveHandover(
  id: number,
  resolution: string,
  finalAmount?: number,
): Promise<{ data: CashHandover }> {
  return apiFetch<{ data: CashHandover }>(
    `/api/v1/cash-handovers/${id}/resolve`,
    {
      method: "POST",
      body: JSON.stringify({
        resolution,
        ...(finalAmount != null ? { final_amount: finalAmount } : {}),
      }),
    },
  );
}

export async function getHandover(
  id: number,
): Promise<{ data: CashHandover }> {
  return apiFetch<{ data: CashHandover }>(`/api/v1/cash-handovers/${id}`);
}
