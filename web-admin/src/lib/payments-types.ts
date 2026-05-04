export const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "whish",
  "omt",
  "areeba",
  "stripe",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank transfer",
  whish: "Whish",
  omt: "OMT",
  areeba: "Areeba",
  stripe: "Stripe",
  other: "Other",
};

export type Payment = {
  id: string;
  customer_id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference_number: string | null;
  status: PaymentStatus;
  collected_by_user_id: number | null;
  collected_at: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  receipt_sent_at: string | null;
  receipt_channels: string[] | null;
  customer?: {
    id: string;
    code: string;
    full_name: string;
    phone_primary: string | null;
  };
  invoice?: {
    id: string;
    number: string;
    total: number;
    balance_due: number;
    status: string;
  };
  collector?: { id: number; name: string } | null;
  created_at: string | null;
};
