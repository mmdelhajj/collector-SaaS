"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  createTemplate,
  updateTemplate,
  type TemplateCreate,
} from "@/lib/templates";

export type TemplateActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateTemplateAction(
  _prev: TemplateActionState | undefined,
  formData: FormData,
): Promise<TemplateActionState> {
  const id = Number(formData.get("id"));
  if (!id) return { error: "Missing template id." };

  const subject = formData.get("subject")?.toString().trim() ?? null;
  const body = formData.get("body")?.toString() ?? "";
  const is_active = formData.get("is_active") === "1";

  try {
    await updateTemplate(id, { subject: subject || null, body, is_active });
    revalidatePath("/settings/templates");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { errors?: Record<string, string[]>; message?: string };
      return { error: b?.message ?? "Could not save template.", fieldErrors: b?.errors };
    }
    return { error: "Could not save template." };
  }
}

export async function createTemplateAction(
  payload: TemplateCreate,
): Promise<TemplateActionState> {
  try {
    await createTemplate(payload);
    revalidatePath("/settings/templates");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { errors?: Record<string, string[]>; message?: string };
      return { error: b?.message ?? "Could not create template.", fieldErrors: b?.errors };
    }
    return { error: "Could not create template." };
  }
}
