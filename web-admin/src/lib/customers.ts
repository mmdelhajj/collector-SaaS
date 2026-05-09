import "server-only";
import { apiFetch } from "@/lib/api";
import type {
  Customer,
  CustomerStatus,
  Paginated,
} from "@/lib/customers-types";

export type {
  Customer,
  CustomerStatus,
  Paginated,
} from "@/lib/customers-types";
export { CUSTOMER_STATUSES } from "@/lib/customers-types";

export type CustomerListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: CustomerStatus;
  sort?: string;
};

export async function listCustomers(
  params: CustomerListParams = {},
): Promise<Paginated<Customer>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("filter[status]", params.status);
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<Customer>>(`/api/v1/customers${suffix}`);
}

export type CreateCustomerPayload = {
  first_name: string;
  last_name: string;
  phone_primary: string;
  phone_secondary?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  national_id?: string | null;
  city?: string | null;
  address_line?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: CustomerStatus;
  notes?: string | null;
};

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<{ data: Customer }> {
  return apiFetch<{ data: Customer }>("/api/v1/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<{ data: Customer }> {
  return apiFetch<{ data: Customer }>(`/api/v1/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiFetch(`/api/v1/customers/${id}`, {
    method: "DELETE",
  });
}

export async function getCustomer(id: string): Promise<{ data: Customer }> {
  return apiFetch<{ data: Customer }>(`/api/v1/customers/${id}`);
}

export type CustomerOutstanding = {
  customer_id: string;
  total_outstanding: number;
  invoice_count: number;
  oldest_due_at: string | null;
  oldest_overdue_days: number;
  buckets: Array<{
    label: string;
    count: number;
    total: number;
    invoice_ids: string[];
  }>;
  all_invoice_ids: string[];
};

export async function getCustomerOutstanding(
  id: string,
): Promise<CustomerOutstanding> {
  const res = await apiFetch<{ data: CustomerOutstanding }>(
    `/api/v1/customers/${id}/outstanding`,
  );
  return res.data;
}
