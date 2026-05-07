"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { actionRequireRole } from "@/lib/auth";
import {
  inviteUser,
  updateUser,
  deactivateUser,
  resetUserPassword,
  transferAndDeleteUser,
  listUsers,
  TENANT_ROLES,
  type TenantRole,
} from "@/lib/users";

const inviteSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  role: z.enum(TENANT_ROLES),
  phone: z.string().max(32).optional().or(z.literal("")),
});

export type InviteState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  result?: {
    id: number;
    name: string;
    email: string;
    temporaryPassword: string;
  };
};

export async function inviteUserAction(
  _prev: InviteState | undefined,
  formData: FormData,
): Promise<InviteState> {
  if (!(await actionRequireRole(["tenant_owner", "tenant_admin"]))) {
    return { error: "Not authorized." };
  }

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { error: "Please check the form below.", fieldErrors };
  }

  try {
    const res = await inviteUser({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
    });
    revalidatePath("/settings/users");
    return {
      ok: true,
      result: {
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        temporaryPassword: res.invite.temporary_password,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (err.status === 422)
        return {
          error: body.message ?? "Validation failed.",
          fieldErrors: body.errors,
        };
      if (err.status === 403)
        return {
          error: "You don't have permission to invite users.",
        };
    }
    return { error: "Could not invite user. Please try again." };
  }
}

export type RoleChangeState = { ok?: boolean; error?: string };

export async function changeRoleAction(
  userId: number,
  role: TenantRole,
): Promise<RoleChangeState> {
  if (!(await actionRequireRole(["tenant_owner", "tenant_admin"]))) {
    return { error: "Not authorized." };
  }
  try {
    await updateUser(userId, { role });
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { message?: string } | null;
      if (err.status === 403 || err.status === 409) {
        return { error: body?.message ?? "Not allowed." };
      }
    }
    return { error: "Could not change role." };
  }
}

export type PasswordResetState =
  | { ok: true; password: string; wasGenerated: boolean }
  | { ok?: false; error: string; fieldErrors?: Record<string, string[]> };

export async function resetPasswordAction(
  userId: number,
  customPassword?: string,
): Promise<PasswordResetState> {
  if (!(await actionRequireRole(["tenant_owner", "tenant_admin"]))) {
    return { error: "Not authorized." };
  }
  const trimmed = customPassword?.trim();
  if (trimmed && trimmed.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
      fieldErrors: { password: ["Min 8 characters."] },
    };
  }
  try {
    const res = await resetUserPassword(userId, trimmed || undefined);
    revalidatePath("/settings/users");
    return {
      ok: true,
      password: res.reset.temporary_password,
      wasGenerated: res.reset.was_generated,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403) return { error: "Forbidden." };
      if (err.status === 422) {
        const body = err.body as {
          message?: string;
          errors?: Record<string, string[]>;
        };
        return {
          error: body.message ?? "Invalid password.",
          fieldErrors: body.errors,
        };
      }
    }
    return { error: "Could not reset password." };
  }
}

export type InheritorOption = {
  id: number;
  name: string;
  email: string;
  role: TenantRole | null;
};

export async function listInheritorCandidatesAction(
  excludeId: number,
): Promise<InheritorOption[]> {
  if (!(await actionRequireRole(["tenant_owner", "tenant_admin"]))) {
    return [];
  }
  const res = await listUsers({ perPage: 100, isActive: true });
  return res.data
    .filter((u) => u.id !== excludeId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: (u.roles[0] as TenantRole | undefined) ?? null,
    }));
}

export type DeleteUserState = { ok?: boolean; error?: string };

export async function deleteUserAction(
  userId: number,
  transferToId: number,
): Promise<DeleteUserState> {
  if (!(await actionRequireRole(["tenant_owner", "tenant_admin"]))) {
    return { error: "Not authorized." };
  }
  if (!transferToId) {
    return { error: "Pick a user to inherit their records." };
  }
  try {
    await transferAndDeleteUser(userId, transferToId);
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { message?: string } | null;
      if (err.status === 403 || err.status === 409 || err.status === 422) {
        return { error: body?.message ?? "Not allowed." };
      }
    }
    return { error: "Could not delete user." };
  }
}

export async function toggleActiveAction(
  userId: number,
  shouldActivate: boolean,
): Promise<RoleChangeState> {
  if (!(await actionRequireRole(["tenant_owner", "tenant_admin"]))) {
    return { error: "Not authorized." };
  }
  try {
    if (shouldActivate) {
      await updateUser(userId, { is_active: true });
    } else {
      await deactivateUser(userId);
    }
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403) return { error: "Forbidden." };
      if (err.status === 409)
        return { error: "You can't deactivate your own account." };
    }
    return { error: "Could not update user status." };
  }
}
