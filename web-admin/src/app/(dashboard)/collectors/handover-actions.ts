"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { confirmHandover, disputeHandover } from "@/lib/handovers";

export type HandoverActionState = { ok?: boolean; error?: string };

export async function confirmHandoverAction(
  id: number,
): Promise<HandoverActionState> {
  try {
    await confirmHandover(id);
    revalidatePath("/collectors");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403) return { error: "Forbidden." };
      if (err.status === 409)
        return { error: "Already confirmed or disputed." };
      if (err.status === 404) return { error: "Handover not found." };
    }
    return { error: "Could not confirm handover." };
  }
}

export async function disputeHandoverAction(
  id: number,
  reason: string,
): Promise<HandoverActionState> {
  if (!reason || reason.trim().length === 0) {
    return { error: "Please give a reason for the dispute." };
  }
  try {
    await disputeHandover(id, reason);
    revalidatePath("/collectors");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403) return { error: "Forbidden." };
      if (err.status === 409) return { error: "Already actioned." };
      if (err.status === 422) return { error: "Reason is required." };
    }
    return { error: "Could not dispute handover." };
  }
}
