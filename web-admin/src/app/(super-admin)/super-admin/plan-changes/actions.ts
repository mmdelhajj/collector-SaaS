"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { actionRequireSuperAdmin } from "@/lib/auth";
import {
  approvePlanChangeRequest,
  rejectPlanChangeRequest,
} from "@/lib/super-admin";

type Result = { ok?: boolean; error?: string };
const NOT_AUTHORIZED: Result = { error: "Not authorized." };

export async function approvePlanRequestAction(
  id: number,
  note: string,
): Promise<Result> {
  if (!(await actionRequireSuperAdmin())) return NOT_AUTHORIZED;
  try {
    await approvePlanChangeRequest(id, note || undefined);
    revalidatePath("/super-admin/plan-changes");
    revalidatePath("/super-admin");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not approve." };
    }
    return { error: "Could not approve." };
  }
}

export async function rejectPlanRequestAction(
  id: number,
  note: string,
): Promise<Result> {
  if (!(await actionRequireSuperAdmin())) return NOT_AUTHORIZED;
  if (!note.trim()) return { error: "A reason is required to reject." };
  try {
    await rejectPlanChangeRequest(id, note.trim());
    revalidatePath("/super-admin/plan-changes");
    revalidatePath("/super-admin");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not reject." };
    }
    return { error: "Could not reject." };
  }
}
