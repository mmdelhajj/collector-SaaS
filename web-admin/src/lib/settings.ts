import "server-only";
import { apiFetch } from "@/lib/api";
import type {
  IntegrationsSettings,
  WorkspaceSettings,
} from "@/lib/settings-types";

export async function getWorkspace(): Promise<WorkspaceSettings> {
  const res = await apiFetch<{ data: WorkspaceSettings }>(
    "/api/v1/settings/workspace",
  );
  return res.data;
}

export async function updateWorkspace(
  patch: Partial<WorkspaceSettings>,
): Promise<WorkspaceSettings> {
  const res = await apiFetch<{ data: WorkspaceSettings }>(
    "/api/v1/settings/workspace",
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return res.data;
}

export async function getIntegrations(): Promise<IntegrationsSettings> {
  const res = await apiFetch<{ data: IntegrationsSettings }>(
    "/api/v1/settings/integrations",
  );
  return res.data;
}

export type IntegrationsPatch = {
  whatsapp?: Partial<{
    provider: string;
    api_url: string;
    api_key: string;
    from_number: string;
  }>;
  sms?: Partial<{
    provider: string;
    sid: string;
    token: string;
    from: string;
  }>;
  radius?: Partial<{
    shared_secret: string;
    allowed_ips: string[];
  }>;
};

export async function updateIntegrations(
  patch: IntegrationsPatch,
): Promise<IntegrationsSettings> {
  const res = await apiFetch<{ data: IntegrationsSettings }>(
    "/api/v1/settings/integrations",
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return res.data;
}

export type NotificationSettings = {
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  send_invoice_on_create: boolean;
  send_receipt_on_payment: boolean;
  reminder_days_before: number[];
  overdue_days_after: number[];
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

export async function getNotifications(): Promise<NotificationSettings> {
  const res = await apiFetch<{ data: NotificationSettings }>(
    "/api/v1/settings/notifications",
  );
  return res.data;
}

export async function updateNotifications(
  patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const res = await apiFetch<{ data: NotificationSettings }>(
    "/api/v1/settings/notifications",
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return res.data;
}

export type PaymentSettings = {
  handover_methods: string[];
  available_methods: string[];
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const res = await apiFetch<{ data: PaymentSettings }>(
    "/api/v1/settings/payments",
  );
  return res.data;
}

export async function updatePaymentSettings(
  handoverMethods: string[],
): Promise<PaymentSettings> {
  const res = await apiFetch<{ data: PaymentSettings }>(
    "/api/v1/settings/payments",
    {
      method: "PATCH",
      body: JSON.stringify({ handover_methods: handoverMethods }),
    },
  );
  return res.data;
}

// ─── Currency & exchange ────────────────────────────────────────────────

export type CurrencySettings = {
  currency_primary: string;
  currency_secondary: string | null;
  exchange_rate: number | null;
  exchange_rate_updated_at: string | null;
  exchange_rate_source: "manual" | "auto";
  history: Array<{
    created_at: string | null;
    old_rate: number | null;
    new_rate: number | null;
    user: { id: number; name: string; email: string } | null;
  }>;
};

export async function getCurrencySettings(): Promise<CurrencySettings> {
  const res = await apiFetch<{ data: CurrencySettings }>(
    "/api/v1/settings/currency",
  );
  return res.data;
}

export async function updateCurrencySettings(payload: {
  currency_primary?: string;
  currency_secondary?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: "manual" | "auto";
}): Promise<CurrencySettings> {
  const res = await apiFetch<{ data: CurrencySettings }>(
    "/api/v1/settings/currency",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function refreshExchangeRate(): Promise<CurrencySettings> {
  const res = await apiFetch<{ data: CurrencySettings }>(
    "/api/v1/settings/currency/refresh",
    { method: "POST" },
  );
  return res.data;
}

// ─── Billing / subscription ─────────────────────────────────────────────

export type SubscriptionPlan = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number | null;
  limit_customers: number | null;
  limit_users: number | null;
  limit_collectors: number | null;
  feature_radius: boolean;
  feature_whatsapp: boolean;
  feature_sms: boolean;
  feature_priority_support: boolean;
};

export type SubscriptionInfo = {
  tenant: {
    id: string;
    name: string;
    status: string;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    billing_period: string;
    currency_primary: string;
  };
  plan: SubscriptionPlan | null;
  usage: { customers: number; users: number; collectors: number };
  limits: {
    customers: number | null;
    users: number | null;
    collectors: number | null;
  };
};

export async function getSubscription(): Promise<SubscriptionInfo> {
  const res = await apiFetch<{ data: SubscriptionInfo }>(
    "/api/v1/billing/subscription",
  );
  return res.data;
}

export async function getAvailablePlans(): Promise<SubscriptionPlan[]> {
  const res = await apiFetch<{ data: SubscriptionPlan[] }>(
    "/api/v1/billing/available-plans",
  );
  return res.data;
}

export async function changePlan(payload: {
  plan_code: string;
  billing_period: "monthly" | "annual";
}): Promise<SubscriptionInfo> {
  const res = await apiFetch<{ data: SubscriptionInfo }>(
    "/api/v1/billing/change-plan",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
