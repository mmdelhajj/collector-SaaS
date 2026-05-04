"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { submitHandover } from "@/lib/collector-self";

export type HandoverResult = {
  ok?: boolean;
  error?: string;
};

export async function submitHandoverAction(payload: {
  to_user_id: number;
  amount: number;
  notes?: string;
}): Promise<HandoverResult> {
  if (!payload.to_user_id) return { error: "Pick a supervisor." };
  if (!Number.isFinite(payload.amount) || payload.amount < 0)
    return { error: "Enter a valid amount." };

  try {
    await submitHandover(payload);
    revalidatePath("/my-route");
    revalidatePath("/cash-handovers");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not submit handover." };
    }
    return { error: "Could not submit handover." };
  }
}
