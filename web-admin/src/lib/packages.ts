import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type { Package, BillingType, BillingPeriod } from "@/lib/packages-types";

export type { Package, BillingType, BillingPeriod } from "@/lib/packages-types";
export { BILLING_TYPES, BILLING_PERIODS } from "@/lib/packages-types";

export type PackageListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  isActive?: boolean;
  billingType?: BillingType;
  sort?: string;
};

export async function listPackages(
  params: PackageListParams = {},
): Promise<Paginated<Package>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.isActive !== undefined)
    qs.set("filter[is_active]", params.isActive ? "1" : "0");
  if (params.billingType) qs.set("filter[billing_type]", params.billingType);
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<Package>>(`/api/v1/packages${suffix}`);
}

export type CreatePackagePayload = {
  name: string;
  code: string;
  description?: string | null;
  billing_type: BillingType;
  billing_period: BillingPeriod;
  billing_period_days?: number | null;
  price: number;
  currency?: string;
  setup_fee?: number;
  speed_down_mbps?: number | null;
  speed_up_mbps?: number | null;
  data_quota_gb?: number | null;
  radius_group_name?: string | null;
  is_active?: boolean;
};

export async function createPackage(
  payload: CreatePackagePayload,
): Promise<{ data: Package }> {
  return apiFetch<{ data: Package }>("/api/v1/packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UpdatePackagePayload = Partial<CreatePackagePayload>;

export async function updatePackage(
  id: number,
  payload: UpdatePackagePayload,
): Promise<{ data: Package }> {
  return apiFetch<{ data: Package }>(`/api/v1/packages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePackage(id: number): Promise<void> {
  await apiFetch(`/api/v1/packages/${id}`, { method: "DELETE" });
}
