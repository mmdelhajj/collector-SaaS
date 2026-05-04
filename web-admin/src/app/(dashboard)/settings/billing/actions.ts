"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { changePlan } from "@/lib/settings";

type Result = { ok?: boolean; error?: string };

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

export async function changePlanAction(payload: {
  plan_code: string;
  billing_period: "monthly" | "annual";
}): Promise<Result> {
  try {
    await changePlan(payload);
    revalidatePath("/settings/billing");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not change plan.") };
  }
}
