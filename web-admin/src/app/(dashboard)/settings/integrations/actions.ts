"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { updateIntegrations, type IntegrationsPatch } from "@/lib/settings";

export type IntegrationsFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateIntegrationsAction(
  _prev: IntegrationsFormState | undefined,
  formData: FormData,
): Promise<IntegrationsFormState> {
  const allowedIpsRaw = formData.get("radius_allowed_ips")?.toString() ?? "";
  const allowedIps = allowedIpsRaw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const apiKey = formData.get("whatsapp_api_key")?.toString().trim() ?? "";
  const smsToken = formData.get("sms_token")?.toString().trim() ?? "";
  const radiusSecret =
    formData.get("radius_shared_secret")?.toString().trim() ?? "";

  const patch: IntegrationsPatch = {
    whatsapp: {
      provider: formData.get("whatsapp_provider")?.toString() || "360dialog",
      api_url: formData.get("whatsapp_api_url")?.toString().trim() || "",
      from_number: formData.get("whatsapp_from")?.toString().trim() || "",
      ...(apiKey ? { api_key: apiKey } : {}),
    },
    sms: {
      provider: formData.get("sms_provider")?.toString() || "twilio",
      sid: formData.get("sms_sid")?.toString().trim() || "",
      from: formData.get("sms_from")?.toString().trim() || "",
      ...(smsToken ? { token: smsToken } : {}),
    },
    radius: {
      allowed_ips: allowedIps,
      ...(radiusSecret ? { shared_secret: radiusSecret } : {}),
    },
  };

  try {
    await updateIntegrations(patch);
    revalidatePath("/settings/integrations");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        errors?: Record<string, string[]>;
        message?: string;
      };
      return {
        error: body?.message ?? "Could not save integrations.",
        fieldErrors: body?.errors,
      };
    }
    return { error: "Could not save integrations." };
  }
}
