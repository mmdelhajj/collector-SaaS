import "server-only";
import { apiFetch } from "@/lib/api";

export type PlatformOverview = {
  tenants: { total: number; trial: number; active: number; suspended: number };
  users: number;
  customers: number;
  invoices: number;
  payments: number;
  mrr: number;
  arr: number;
  collected_30d: number;
};

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_price: number | null;
  status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  users_count: number;
  customers_count: number;
  created_at: string | null;
};

export type TenantDetail = TenantRow & {
  billing_period: string;
  currency_primary: string;
  timezone: string;
  locale: string;
  stats: {
    users: number;
    customers: number;
    unpaid_invoices: number;
    collected_30d: number;
  };
  users: Array<{
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    last_login_at: string | null;
    roles: string[];
  }>;
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const res = await apiFetch<{ data: PlatformOverview }>(
    "/api/v1/super-admin/overview",
  );
  return res.data;
}

export async function listAllTenants(
  params: {
    search?: string;
    status?: string;
  } = {},
): Promise<{ tenants: TenantRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  const res = await apiFetch<{
    data: TenantRow[];
    meta: { total: number };
  }>(`/api/v1/super-admin/tenants${qs.toString() ? "?" + qs : ""}`);
  return { tenants: res.data, total: res.meta.total };
}

export async function getTenantDetail(id: string): Promise<TenantDetail> {
  const res = await apiFetch<{ data: TenantDetail }>(
    `/api/v1/super-admin/tenants/${id}`,
  );
  return res.data;
}

export async function suspendTenant(id: string): Promise<void> {
  await apiFetch(`/api/v1/super-admin/tenants/${id}/suspend`, {
    method: "POST",
  });
}

export async function reactivateTenant(id: string): Promise<void> {
  await apiFetch(`/api/v1/super-admin/tenants/${id}/reactivate`, {
    method: "POST",
  });
}

export type DeleteTenantResult = {
  data: {
    deleted_tenant_id: string;
    cascaded: { users: number; customers: number; invoices: number; payments: number };
  };
};

export async function deleteTenantApi(
  id: string,
  confirmSlug: string,
): Promise<DeleteTenantResult> {
  return apiFetch<DeleteTenantResult>(
    `/api/v1/super-admin/tenants/${id}/delete`,
    {
      method: "POST",
      body: JSON.stringify({ confirm_slug: confirmSlug }),
    },
  );
}

export type CreateTenantPayload = {
  company_name: string;
  owner_name: string;
  owner_email: string;
  plan: "starter" | "growth" | "pro";
  billing_period?: "monthly" | "annual";
  trial_days?: number;
  status?: "trial" | "active";
};

export type CreateTenantResult = {
  data: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    trial_ends_at: string | null;
  };
  owner: {
    id: number;
    name: string;
    email: string;
    temporary_password: string;
  };
  message: string;
};

export async function createTenant(
  payload: CreateTenantPayload,
): Promise<CreateTenantResult> {
  return apiFetch<CreateTenantResult>("/api/v1/super-admin/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UpdateTenantPayload = Partial<{
  name: string;
  plan: "starter" | "growth" | "pro";
  billing_period: "monthly" | "annual";
  status: "trial" | "active" | "suspended";
  extend_trial_days: number;
}>;

export async function updateTenantApi(
  id: string,
  patch: UpdateTenantPayload,
): Promise<void> {
  await apiFetch(`/api/v1/super-admin/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export type PlatformSettings = {
  smtp: {
    host: string;
    port: number;
    username: string;
    password_set: boolean;
    encryption: "tls" | "ssl" | "none";
    from_address: string;
    from_name: string;
  };
  branding: {
    platform_name: string;
    support_email: string;
    logo_url: string;
    tagline: string;
  };
  defaults: {
    default_trial_days: number;
    default_signup_plan: "starter" | "growth" | "pro";
    allow_public_signup: boolean;
  };
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const res = await apiFetch<{ data: PlatformSettings }>(
    "/api/v1/super-admin/settings",
  );
  return res.data;
}

export async function updateSmtp(payload: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: "tls" | "ssl" | "none";
  from_address: string;
  from_name: string;
}): Promise<void> {
  await apiFetch("/api/v1/super-admin/settings/smtp", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateBranding(payload: {
  platform_name: string;
  support_email?: string;
  logo_url?: string;
  tagline?: string;
}): Promise<void> {
  await apiFetch("/api/v1/super-admin/settings/branding", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateDefaults(payload: {
  default_trial_days: number;
  default_signup_plan: "starter" | "growth" | "pro";
  allow_public_signup: boolean;
}): Promise<void> {
  await apiFetch("/api/v1/super-admin/settings/defaults", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function testSmtp(
  to: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch<{ ok: boolean; message: string }>(
    "/api/v1/super-admin/settings/smtp/test",
    {
      method: "POST",
      body: JSON.stringify({ to }),
    },
  );
}

// ─── Subscription plans ──────────────────────────────────────────────

export type Plan = {
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
  is_public: boolean;
  sort_order: number;
  tenants_count: number;
  created_at: string | null;
  updated_at: string | null;
};

export type PlanWritePayload = Partial<
  Omit<Plan, "id" | "tenants_count" | "created_at" | "updated_at">
>;

export async function listPlans(): Promise<Plan[]> {
  const res = await apiFetch<{ data: Plan[] }>("/api/v1/super-admin/plans");
  return res.data;
}

export async function createPlan(payload: PlanWritePayload): Promise<Plan> {
  const res = await apiFetch<{ data: Plan }>("/api/v1/super-admin/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePlan(
  id: number,
  payload: PlanWritePayload,
): Promise<Plan> {
  const res = await apiFetch<{ data: Plan }>(
    `/api/v1/super-admin/plans/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function deletePlan(id: number): Promise<void> {
  await apiFetch(`/api/v1/super-admin/plans/${id}`, { method: "DELETE" });
}

// ─── Plan-change approval queue ────────────────────────────────────────────

export type PlanChangeRequestRow = {
  id: number;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    current_plan: string | null;
    current_period: string | null;
  } | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_plan: {
    code: string;
    name: string;
    price_monthly: number;
    price_annual: number | null;
  } | null;
  requested_period: "monthly" | "annual";
  requested_by: { id: number; name: string; email: string } | null;
  requester_note: string | null;
  decision_note: string | null;
  decided_by: string | null;
  created_at: string | null;
  decided_at: string | null;
};

export async function listPlanChangeRequests(
  status: "pending" | "approved" | "rejected" | "cancelled" | "all" = "pending",
): Promise<{ requests: PlanChangeRequestRow[]; pendingCount: number }> {
  const res = await apiFetch<{
    data: PlanChangeRequestRow[];
    pending_count: number;
  }>(`/api/v1/super-admin/plan-change-requests?status=${status}`);
  return { requests: res.data, pendingCount: res.pending_count };
}

export async function approvePlanChangeRequest(
  id: number,
  note?: string,
): Promise<void> {
  await apiFetch(`/api/v1/super-admin/plan-change-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ decision_note: note ?? null }),
  });
}

export async function rejectPlanChangeRequest(
  id: number,
  note: string,
): Promise<void> {
  await apiFetch(`/api/v1/super-admin/plan-change-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ decision_note: note }),
  });
}
