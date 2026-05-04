import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type { RadiusStatus, RadiusUser } from "@/lib/radius-types";

export type { RadiusStatus, RadiusUser } from "@/lib/radius-types";
export { RADIUS_STATUSES } from "@/lib/radius-types";

export type RadiusUserListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: RadiusStatus;
};

export async function listRadiusUsers(
  params: RadiusUserListParams = {},
): Promise<Paginated<RadiusUser>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("filter[status]", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<RadiusUser>>(`/api/v1/radius-users${suffix}`);
}

export async function suspendRadiusUser(
  id: number,
): Promise<{ data: RadiusUser }> {
  return apiFetch<{ data: RadiusUser }>(
    `/api/v1/radius-users/${id}/suspend`,
    { method: "POST" },
  );
}

export async function reactivateRadiusUser(
  id: number,
): Promise<{ data: RadiusUser }> {
  return apiFetch<{ data: RadiusUser }>(
    `/api/v1/radius-users/${id}/reactivate`,
    { method: "POST" },
  );
}

export async function changeRadiusSpeed(
  id: number,
  radiusGroup: string,
): Promise<{ data: RadiusUser }> {
  return apiFetch<{ data: RadiusUser }>(
    `/api/v1/radius-users/${id}/change-speed`,
    {
      method: "POST",
      body: JSON.stringify({ radius_group: radiusGroup }),
    },
  );
}

export type RadiusSession = {
  id: number;
  session_id: string;
  nas_ip: string | null;
  framed_ip: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  bytes_in: number;
  bytes_out: number;
  terminate_cause: string | null;
};

export async function listRadiusSessions(
  id: number,
): Promise<{ data: RadiusSession[] }> {
  return apiFetch<{ data: RadiusSession[] }>(
    `/api/v1/radius-users/${id}/sessions`,
  );
}
