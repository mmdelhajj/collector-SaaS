"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { actionRequireRole } from "@/lib/auth";
import { updateRolePermissions } from "@/lib/roles";

export type SaveResult = {
  ok?: boolean;
  error?: string;
};

export async function saveRolePermissionsAction(
  name: string,
  permissions: string[],
): Promise<SaveResult> {
  // Tenant_owner only — role-permission editing reshapes the entire RBAC
  // grid for the tenant. Pre-fix any cookie-bearing user could call this
  // action endpoint directly; Laravel rejected but the action surface
  // leaked existence + exact backend error.
  if (!(await actionRequireRole(["tenant_owner"]))) {
    return { error: "Not authorized." };
  }
  try {
    await updateRolePermissions(name, permissions);
    revalidatePath("/settings/roles");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      if (err.status === 403)
        return { error: "You don't have permission to edit roles." };
      if (err.status === 422 && b?.message) return { error: b.message };
    }
    return { error: "Could not save role." };
  }
}
