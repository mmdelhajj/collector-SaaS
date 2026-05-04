import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type { TenantRole, TenantUser } from "@/lib/users-types";

export type { TenantRole, TenantUser } from "@/lib/users-types";
export {
  TENANT_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from "@/lib/users-types";

export type UserListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  role?: TenantRole;
  isActive?: boolean;
};

export async function listUsers(
  params: UserListParams = {},
): Promise<Paginated<TenantUser>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("filter[role]", params.role);
  if (params.isActive !== undefined)
    qs.set("filter[is_active]", params.isActive ? "1" : "0");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<TenantUser>>(`/api/v1/users${suffix}`);
}

export type InviteUserPayload = {
  name: string;
  email: string;
  role: TenantRole;
  phone?: string | null;
  locale?: string;
};

export type InviteUserResponse = {
  data: TenantUser;
  invite: { temporary_password: string; message: string };
};

export async function inviteUser(
  payload: InviteUserPayload,
): Promise<InviteUserResponse> {
  return apiFetch<InviteUserResponse>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UpdateUserPayload = Partial<{
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: TenantRole;
  locale: string;
}>;

export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<{ data: TenantUser }> {
  return apiFetch<{ data: TenantUser }>(`/api/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listCollectors(): Promise<TenantUser[]> {
  const res = await listUsers({
    perPage: 100,
    role: "collector",
    isActive: true,
  });
  return res.data;
}

export async function deactivateUser(
  id: number,
): Promise<{ data: TenantUser }> {
  return apiFetch<{ data: TenantUser }>(`/api/v1/users/${id}`, {
    method: "DELETE",
  });
}

export type PasswordResetResult = {
  data: TenantUser;
  reset: {
    temporary_password: string;
    was_generated: boolean;
    message: string;
  };
};

/**
 * Admin password reset — pass a custom value or omit to generate one.
 * Returns the plain-text password so the admin can copy + share via a
 * secure side channel.
 */
export async function resetUserPassword(
  id: number,
  customPassword?: string,
): Promise<PasswordResetResult> {
  return apiFetch<PasswordResetResult>(`/api/v1/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify(customPassword ? { password: customPassword } : {}),
  });
}
