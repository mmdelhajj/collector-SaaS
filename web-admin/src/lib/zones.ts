import "server-only";
import { apiFetch } from "@/lib/api";
import type { CollectorZone } from "@/lib/zones-types";

export async function listZones(): Promise<CollectorZone[]> {
  const res = await apiFetch<{ data: CollectorZone[] }>(
    "/api/v1/collector-zones",
  );
  return res.data;
}

export type ZonePayload = {
  name: string;
  color?: string;
  polygon: Array<[number, number]>;
  default_collector_id?: number | null;
  is_active?: boolean;
};

export async function createZone(
  payload: ZonePayload,
): Promise<{ data: CollectorZone }> {
  return apiFetch<{ data: CollectorZone }>("/api/v1/collector-zones", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateZone(
  id: number,
  patch: Partial<ZonePayload>,
): Promise<{ data: CollectorZone }> {
  return apiFetch<{ data: CollectorZone }>(`/api/v1/collector-zones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteZone(id: number): Promise<void> {
  await apiFetch(`/api/v1/collector-zones/${id}`, { method: "DELETE" });
}
