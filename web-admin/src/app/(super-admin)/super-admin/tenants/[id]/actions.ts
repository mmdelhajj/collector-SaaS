"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  reactivateTenant,
  suspendTenant,
  updateTenantApi,
  type UpdateTenantPayload,
} from "@/lib/super-admin";

type Result = { ok?: boolean; error?: string };

export async function updateTenantAction(
  id: string,
  patch: UpdateTenantPayload,
): Promise<Result> {
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
