export const BILLING_TYPES = [
  "recurring",
  "prepaid",
  "postpaid",
  "usage_based",
] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

export const BILLING_PERIODS = [
  "monthly",
  "quarterly",
  "annual",
  "custom_days",
] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export type Package = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  service_category_id: number | null;
  billing_type: BillingType;
  billing_period: BillingPeriod;
  billing_period_days: number | null;
  price: number;
  currency: string;
  setup_fee: number;
  deposit: number;
  tax_rate: number;
  speed_down_mbps: number | null;
  speed_up_mbps: number | null;
  data_quota_gb: number | null;
  amperage: number | null;
  kwh_included: number | null;
  radius_group_name: string | null;
  is_active: boolean;
  sort_order: number;
  subscriptions_count?: number;
  created_at: string | null;
  updated_at: string | null;
};
