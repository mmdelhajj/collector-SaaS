import "server-only";
import { apiFetch } from "@/lib/api";
import type { MessageTemplate } from "@/lib/templates-types";

export async function listTemplates(): Promise<MessageTemplate[]> {
  const res = await apiFetch<{ data: MessageTemplate[] }>(
    "/api/v1/message-templates",
  );
  return res.data;
}

export type TemplatePatch = {
  subject?: string | null;
  body?: string;
  is_active?: boolean;
};

export async function updateTemplate(
  id: number,
  patch: TemplatePatch,
): Promise<MessageTemplate> {
  const res = await apiFetch<{ data: MessageTemplate }>(
    `/api/v1/message-templates/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  return res.data;
}

export type TemplateCreate = {
  key: string;
  channel: "whatsapp" | "sms" | "email";
  locale: "en" | "ar" | "fr";
  subject?: string | null;
  body: string;
};

export async function createTemplate(
  payload: TemplateCreate,
): Promise<MessageTemplate> {
  const res = await apiFetch<{ data: MessageTemplate }>(
    "/api/v1/message-templates",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
