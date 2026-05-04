"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  createTenant,
  type CreateTenantPayload,
  type CreateTenantResult,
} from "@/lib/super-admin";

export type CreateResult =
  | { ok: true; result: CreateTenantResult }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createTenantAction(
  payload: CreateTenantPayload,
): Promise<CreateResult> {
  try {
    const result = await createTenant(payload);
    revalidatePath("/super-admin");
    revalidatePath("/super-admin/tenants");
    return { ok: true, result };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      return {
        ok: false,
        error: b?.message ?? "Could not create tenant.",
        fieldErrors: b?.errors,
      };
    }
    return { ok: false, error: "Could not create tenant." };
  }
}
