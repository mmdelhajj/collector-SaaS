"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { updatePaymentSettings } from "@/lib/settings";

export type SaveResult = { ok?: boolean; error?: string };

export async function savePaymentRoutingAction(
  handoverMethods: string[],
): Promise<SaveResult> {
  try {
    await updatePaymentSettings(handoverMethods);
    revalidatePath("/settings/payments");
    revalidatePath("/my-route");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not save." };
    }
    return { error: "Could not save." };
  }
}
