"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { actionRequireSuperAdmin } from "@/lib/auth";
import {
  reactivateTenant,
  suspendTenant,
  updateTenantApi,
  type UpdateTenantPayload,
} from "@/lib/super-admin";

type Result = { ok?: boolean; error?: string };

const NOT_AUTHORIZED: Result = { error: "Not authorized." };

export async function updateTenantAction(
  id: string,
  patch: UpdateTenantPayload,
): Promise<Result> {
  // Defence-in-depth: pre-fix any cookie-bearing user could call this Server
  // Action endpoint directly. Layout-only role gates don't traverse on
  // direct POSTs to action IDs. Verify role HERE before forwarding.
  if (!(await actionRequireSuperAdmin())) return NOT_AUTHORIZED;

  try {
    await updateTenantApi(id, patch);
    revalidatePath(`/super-admin/tenants/${id}`);
    revalidatePath("/super-admin/tenants");
    revalidatePath("/super-admin");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not save." };
    }
    return { error: "Could not save." };
  }
}

export async function suspendTenantAction(id: string): Promise<Result> {
  if (!(await actionRequireSuperAdmin())) return NOT_AUTHORIZED;

  try {
    await suspendTenant(id);
    revalidatePath(`/super-admin/tenants/${id}`);
    revalidatePath("/super-admin/tenants");
    revalidatePath("/super-admin");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not suspend." };
    }
    return { error: "Could not suspend." };
  }
}

export async function reactivateTenantAction(id: string): Promise<Result> {
  if (!(await actionRequireSuperAdmin())) return NOT_AUTHORIZED;

  try {
    await reactivateTenant(id);
    revalidatePath(`/super-admin/tenants/${id}`);
    revalidatePath("/super-admin/tenants");
    revalidatePath("/super-admin");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not reactivate." };
    }
    return { error: "Could not reactivate." };
  }
}
