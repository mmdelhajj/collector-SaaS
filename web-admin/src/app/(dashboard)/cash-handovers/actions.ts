"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { confirmHandover, disputeHandover, resolveHandover } from "@/lib/handovers";

type Result = { ok?: boolean; error?: string };

export async function confirmHandoverAction(id: number): Promise<Result> {
  try {
    await confirmHandover(id);
    revalidatePath("/cash-handovers");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not confirm handover." };
    }
    return { error: "Could not confirm handover." };
  }
}

export async function disputeHandoverAction(
  id: number,
  reason: string,
): Promise<Result> {
  if (!reason.trim()) return { error: "Reason is required." };
  try {
    await disputeHandover(id, reason);
    revalidatePath("/cash-handovers");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not flag handover." };
    }
    return { error: "Could not flag handover." };
  }
}

export async function resolveHandoverAction(
  id: number,
  resolution: string,
  finalAmount?: number,
): Promise<Result> {
  if (!resolution.trim()) return { error: "Explain how it was resolved." };
  try {
    await resolveHandover(id, resolution, finalAmount);
    revalidatePath("/cash-handovers");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not resolve." };
    }
    return { error: "Could not resolve." };
  }
}
