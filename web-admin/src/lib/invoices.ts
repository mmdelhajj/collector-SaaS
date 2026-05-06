import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type { Invoice, InvoiceItem, InvoiceStatus } from "@/lib/invoices-types";

export type { Invoice, InvoiceItem, InvoiceStatus } from "@/lib/invoices-types";
export { INVOICE_STATUSES } from "@/lib/invoices-types";

export async function getInvoice(id: string): Promise<{ data: Invoice }> {
  return apiFetch<{ data: Invoice }>(`/api/v1/invoices/${id}`);
}

export type InvoicePublicLink = {
  url: string;
  qr_svg: string;
  expires_in_days: number;
};

export async function getInvoicePublicLink(
  id: string,
): Promise<{ data: InvoicePublicLink }> {
  return apiFetch<{ data: InvoicePublicLink }>(
    `/api/v1/invoices/${id}/public-link`,
  );
}

export type InvoiceListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  overdueOnly?: boolean;
  sort?: string;
};

export async function listInvoices(
  params: InvoiceListParams = {},
): Promise<Paginated<Invoice>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("filter[status]", params.status);
  if (params.customerId) qs.set("filter[customer_id]", params.customerId);
  if (params.overdueOnly) qs.set("filter[overdue]", "1");
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<Invoice>>(`/api/v1/invoices${suffix}`);
}

export type BulkBillingResult = {
  generated: number;
  skipped: number;
  total_amount: number;
  message: string;
};

export async function runBulkBilling(): Promise<BulkBillingResult> {
  return apiFetch<BulkBillingResult>("/api/v1/invoices/generate-bulk", {
    method: "POST",
  });
}
