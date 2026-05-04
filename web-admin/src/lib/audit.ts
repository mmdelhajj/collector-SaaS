import "server-only";
import { apiFetch } from "@/lib/api";
import type { AuditPage } from "@/lib/audit-types";

export async function listAudit(
  params: {
    page?: number;
    perPage?: number;
    search?: string;
    action?: string;
  } = {},
): Promise<AuditPage> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.action) qs.set("filter[action]", params.action);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<AuditPage>(`/api/v1/audit-logs${suffix}`);
}
