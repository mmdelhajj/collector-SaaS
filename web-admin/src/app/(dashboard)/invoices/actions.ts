"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { runBulkBilling } from "@/lib/invoices";

export type BulkBillingState = {
  ok?: boolean;
  error?: string;
  result?: { generated: number; skipped: number; total_amount: number };
};

export async function runBulkBillingAction(): Promise<BulkBillingState> {
  try {
    const res = await runBulkBilling();
    revalidatePath("/invoices");
    return {
      ok: true,
      result: {
        generated: res.generated,
        skipped: res.skipped,
        total_amount: res.total_amount,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { error: "Session expired." };
      if (err.status === 400) return { error: "No tenant context." };
    }
    return { error: "Could not run billing. Please try again." };
  }
}
