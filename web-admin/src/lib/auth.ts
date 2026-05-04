import "server-only";
import { cookies } from "next/headers";
import { apiFetch, AUTH_COOKIE, ApiError } from "@/lib/api";
import type { TenantRole } from "@/lib/users-types";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  has_avatar: boolean;
  avatar_version: string | null;
  locale: "en" | "ar" | "fr";
  timezone: string;
  email_verified_at: string | null;
  created_at: string | null;
  roles: TenantRole[];
  permissions?: string[];
};

/**
 * Roles allowed to use the web admin. Collectors get a narrower web portal
 * (their route, their stats, cash handovers) — same shell, fewer pages.
 * Customers will get a separate self-service portal once it's built.
 */
export const WEB_ROLES: TenantRole[] = [
  "tenant_owner",
  "tenant_admin",
  "manager",
  "accountant",
  "support",
  "technician",
  "collector",
];

/** Backwards-compat alias for the previous name. */
export const ADMIN_ROLES = WEB_ROLES;

export function isAdminUser(user: CurrentUser | null): boolean {
  if (!user) return false;
  return user.roles.some((r) => WEB_ROLES.includes(r));
}

export function isCollectorOnly(user: CurrentUser | null): boolean {
  if (!user) return false;
  // True when the user is a collector and has no other staff role.
  const staffRoles: TenantRole[] = [
    "tenant_owner",
    "tenant_admin",
    "manager",
    "accountant",
    "support",
    "technician",
  ];
  return (
    user.roles.includes("collector") &&
    !user.roles.some((r) => staffRoles.includes(r))
  );
}

export function primaryRole(user: CurrentUser | null): TenantRole | null {
  if (!user || user.roles.length === 0) return null;
  // tenant_owner > tenant_admin > … in display priority
  for (const r of [
    "tenant_owner",
    "tenant_admin",
    "manager",
    "accountant",
    "support",
    "technician",
    "collector",
    "customer",
  ] as TenantRole[]) {
    if (user.roles.includes(r)) return r;
  }
  return user.roles[0];
}

type LoginResponse = {
  user: CurrentUser;
  token: string;
  expires_at: string | null;
};

export async function loginRequest(input: {
  email: string;
  password: string;
  deviceName?: string;
  twoFactorCode?: string;
  recoveryCode?: string;
}): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      device_name: input.deviceName,
      two_factor_code: input.twoFactorCode,
      recovery_code: input.recoveryCode,
    }),
    authenticated: false,
  });
}

export async function setAuthCookie(token: string, expiresAt: string | null) {
  const jar = await cookies();
  const expires = expiresAt ? new Date(expiresAt) : undefined;
  // Gate the Secure flag on AUTH_COOKIE_SECURE env, NOT NODE_ENV — we run in
  // production mode locally over plain HTTP, where Secure cookies would be
  // dropped by the browser. Set AUTH_COOKIE_SECURE=true once we're behind TLS.
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    // Cached for 30s — /me is hit by every dashboard page render to build
    // the topbar/sidebar. The data (name, roles, tenant, avatar version)
    // changes rarely; if a role is revoked mid-session the worst case is
    // 30s of stale UI before the next render fetches fresh. Backend still
    // enforces every action so no privilege-escalation window opens.
    const res = await apiFetch<{ user: CurrentUser }>("/api/v1/auth/me", {
      revalidate: 30,
    });
    return res.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export type TenantInfo = {
  id: string;
  name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
};

export async function getCurrentTenant(): Promise<TenantInfo | null> {
  try {
    const res = await apiFetch<{
      user: CurrentUser;
      tenant: TenantInfo | null;
    }>("/api/v1/auth/me", { revalidate: 30 });
    return res.tenant;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/**
 * Page-level role gate. 404 (not 403) on mismatch — we don't want to confirm
 * a route exists to a user who shouldn't see it. Use at the top of pages:
 *
 *   await requireRole(["tenant_owner", "tenant_admin"]);
 */
export async function requireRole(allowed: TenantRole[]): Promise<CurrentUser> {
  const { notFound, redirect } = await import("next/navigation");
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
    throw new Error("unreachable"); // help TS narrow
  }
  if (!user.roles.some((r) => allowed.includes(r))) {
    notFound();
    throw new Error("unreachable");
  }
  return user;
}

/**
 * Server-action equivalent of `requireRole` — returns null on missing auth /
 * wrong role instead of throwing notFound (so the action can return a typed
 * error to the form). Pre-fix, several Server Actions forwarded directly to
 * Laravel without any client-side role check; if an attacker hit the action
 * endpoint with a valid cookie of the wrong role, Laravel rejected but the
 * action surface itself leaked which actions exist + exact backend errors.
 */
export async function actionRequireRole(
  allowed: TenantRole[],
): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.roles.some((r) => allowed.includes(r))) return null;
  return user;
}

/**
 * Returns the super-admin user, or null. Super-admins are identified by
 * `tenant_id === null` server-side; here we proxy that via getCurrentTenant.
 */
export async function actionRequireSuperAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const tenant = await getCurrentTenant();
  // Tenant info is null for super-admins; non-null for tenant users.
  if (tenant !== null) return null;
  return user;
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
  } catch {
    // Ignore — we always clear the cookie below.
  } finally {
    await clearAuthCookie();
  }
}
