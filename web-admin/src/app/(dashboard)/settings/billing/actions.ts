"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { cancelPendingPlanRequest, changePlan } from "@/lib/settings";

type Result = { ok?: boolean; error?: string; pending?: boolean };

function describe(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const b = err.body as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (b?.errors) {
      const first = Object.values(b.errors)[0]?.[0];
      if (first) return first;
    }
    if (b?.message) return b.message;
  }
  return fallback;
}

/**
 * Submits a plan change for super-admin approval. Backend returns 202 +
 * the new pending request row; the tenant's plan is NOT mutated until
 * approval lands.
 */
export async function changePlanAction(payload: {
  plan_code: string;
  billing_period: "monthly" | "annual";
  note?: string;
}): Promise<Result> {
  try {
    await changePlan(payload);
    revalidatePath("/settings/billing");
    revalidatePath("/", "layout");
    return { ok: true, pending: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { error: "You already have a pending request awaiting review." };
    }
    return { error: describe(err, "Could not submit request.") };
  }
}

export async function cancelPlanRequestAction(id: number): Promise<Result> {
  try {
    await cancelPendingPlanRequest(id);
    revalidatePath("/settings/billing");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not cancel request.") };
  }
}
