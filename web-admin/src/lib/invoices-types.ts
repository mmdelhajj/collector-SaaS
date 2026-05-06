export const INVOICE_STATUSES = [
  "draft",
  "open",
  "paid",
  "partial",
  "overdue",
  "cancelled",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoiceItem = {
  id: number;
  package_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  meta: Record<string, unknown> | null;
};

export type Invoice = {
  id: string;
  number: string;
  customer_id: string;
  subscription_id: number | null;
  issued_at: string | null;
  due_at: string | null;
  period_start: string | null;
  period_end: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  paid_amount: number;
  balance_due: number;
  paid_at: string | null;
  notes: string | null;
  customer?: {
    id: string;
    code: string;
    full_name: string;
    phone_primary: string | null;
    email: string | null;
    city: string | null;
    district?: string | null;
    neighborhood?: string | null;
    address_line?: string | null;
  };
  items?: InvoiceItem[];
  tenant?: {
    id: string;
    name: string;
    currency_primary: string | null;
    timezone: string | null;
  };
  service_category?: { id: string | number; name: string } | null;
  assignment?: {
    id: number;
    status: "pending" | "in_progress" | "completed" | "failed" | "reassigned";
    priority: number;
    route_order: number | null;
    assigned_at: string | null;
    collector: { id: number; name: string } | null;
  } | null;
  created_at: string | null;
};
