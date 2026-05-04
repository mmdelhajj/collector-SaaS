"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { refreshExchangeRate, updateCurrencySettings } from "@/lib/settings";

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

export async function saveCurrencyAction(payload: {
  currency_primary: string;
  currency_secondary: string | null;
  exchange_rate: number | null;
  exchange_rate_source: "manual" | "auto";
}): Promise<Result> {
  try {
    await updateCurrencySettings(payload);
    revalidatePath("/settings/currency");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not save currency settings.") };
  }
}

export async function refreshRateAction(): Promise<Result> {
  try {
    await refreshExchangeRate();
    revalidatePath("/settings/currency");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not refresh rate.") };
  }
}
