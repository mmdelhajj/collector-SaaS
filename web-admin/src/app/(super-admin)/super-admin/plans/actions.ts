"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  createPlan,
  deletePlan,
  updatePlan,
  type PlanWritePayload,
} from "@/lib/super-admin";

type Result = { ok?: boolean; error?: string };

function describe(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const b = err.body as { message?: string; errors?: Record<string, string[]> };
    if (b?.errors) {
      const first = Object.values(b.errors)[0]?.[0];
      if (first) return first;
    }
    if (b?.message) return b.message;
  }
  return fallback;
}

export async function savePlanAction(
  id: number,
  payload: PlanWritePayload,
): Promise<Result> {
  try {
    await updatePlan(id, payload);
    revalidatePath("/super-admin/plans");
    revalidatePath("/super-admin/tenants");
    revalidatePath("/super-admin");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not save plan.") };
  }
}

export async function createPlanAction(
  payload: PlanWritePayload,
): Promise<Result> {
  try {
    await createPlan(payload);
    revalidatePath("/super-admin/plans");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not create plan.") };
  }
}

export async function deletePlanAction(id: number): Promise<Result> {
  try {
    await deletePlan(id);
    revalidatePath("/super-admin/plans");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not delete plan.") };
  }
}
