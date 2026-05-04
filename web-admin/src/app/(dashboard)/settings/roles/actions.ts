"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { updateRolePermissions } from "@/lib/roles";

export type SaveResult = {
  ok?: boolean;
  error?: string;
};

export async function saveRolePermissionsAction(
  name: string,
  permissions: string[],
): Promise<SaveResult> {
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
