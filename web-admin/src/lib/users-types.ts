export const TENANT_ROLES = [
  "tenant_owner",
  "tenant_admin",
  "manager",
  "accountant",
  "support",
  "technician",
  "collector",
  "customer",
] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export const ROLE_LABELS: Record<TenantRole, string> = {
  tenant_owner: "Owner",
  tenant_admin: "Admin",
  manager: "Manager",
  accountant: "Accountant",
  support: "Support",
  technician: "Technician",
  collector: "Collector",
  customer: "Customer",
};

export const ROLE_DESCRIPTIONS: Record<TenantRole, string> = {
  tenant_owner: "Full access including billing & subscription management.",
  tenant_admin: "Everything except billing — for senior operators.",
  manager: "Customers, packages, invoices, payments and collectors.",
  accountant: "Invoices, payments, refunds and reports.",
  support: "Read-only customer & invoice access for support staff.",
  technician: "Limited access — typically own work tickets only.",
  collector: "Field collector — assigned invoices and payment recording.",
  customer: "Self-service customer portal access only.",
};

export type TenantUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  locale: string | null;
  timezone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  email_verified_at: string | null;
  roles: TenantRole[];
  created_at: string | null;
};
