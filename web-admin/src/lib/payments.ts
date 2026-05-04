import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/payments-types";

export type {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/payments-types";
export {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_METHOD_LABELS,
} from "@/lib/payments-types";

export type PaymentListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  customerId?: string;
  invoiceId?: string;
  from?: string;
  to?: string;
  sort?: string;
};

export async function listPayments(
  params: PaymentListParams = {},
): Promise<Paginated<Payment>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.method) qs.set("filter[method]", params.method);
  if (params.status) qs.set("filter[status]", params.status);
  if (params.customerId) qs.set("filter[customer_id]", params.customerId);
  if (params.invoiceId) qs.set("filter[invoice_id]", params.invoiceId);
  if (params.from) qs.set("filter[from]", params.from);
  if (params.to) qs.set("filter[to]", params.to);
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<Payment>>(`/api/v1/payments${suffix}`);
}

export type RecordPaymentPayload = {
  customer_id: string;
  invoice_id?: string | null;
  amount: number;
  method: PaymentMethod;
  currency?: string;
  reference_number?: string | null;
  notes?: string | null;
  collected_at?: string;
};

export async function recordPayment(
  payload: RecordPaymentPayload,
): Promise<{ data: Payment }> {
  return apiFetch<{ data: Payment }>("/api/v1/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refundPayment(id: string): Promise<{ data: Payment }> {
  return apiFetch<{ data: Payment }>(`/api/v1/payments/${id}/refund`, {
    method: "POST",
  });
}
