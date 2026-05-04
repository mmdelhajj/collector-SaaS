"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { updateWorkspace } from "@/lib/settings";

export type WorkspaceFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateWorkspaceAction(
  _prev: WorkspaceFormState | undefined,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const exchangeRaw = formData.get("exchange_rate")?.toString().trim();
  const patch = {
    name: formData.get("name")?.toString().trim() || undefined,
    logo_url: formData.get("logo_url")?.toString().trim() || null,
    primary_color: formData.get("primary_color")?.toString().trim() || null,
    currency_primary: formData.get("currency_primary")?.toString() || undefined,
    currency_secondary:
      formData.get("currency_secondary")?.toString().trim() || null,
    exchange_rate: exchangeRaw ? Number(exchangeRaw) : null,
    timezone: formData.get("timezone")?.toString() || undefined,
    locale: formData.get("locale")?.toString() as "ar" | "en" | "fr" | undefined,
  };

  try {
    await updateWorkspace(patch);
    revalidatePath("/settings/workspace");
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { errors?: Record<string, string[]>; message?: string };
      return {
        error: body?.message ?? "Could not save workspace settings.",
        fieldErrors: body?.errors,
      };
    }
    return { error: "Could not save workspace settings." };
  }
}
