"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { updateNotifications, type NotificationSettings } from "@/lib/settings";

export type NotifFormState = {
  ok?: boolean;
  error?: string;
};

function parseDays(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 120);
}

export async function updateNotificationsAction(
  _prev: NotifFormState | undefined,
  formData: FormData,
): Promise<NotifFormState> {
  const patch: Partial<NotificationSettings> = {
    whatsapp_enabled: formData.get("whatsapp_enabled") === "1",
    sms_enabled: formData.get("sms_enabled") === "1",
    email_enabled: formData.get("email_enabled") === "1",
    send_invoice_on_create: formData.get("send_invoice_on_create") === "1",
    send_receipt_on_payment: formData.get("send_receipt_on_payment") === "1",
    reminder_days_before: parseDays(
      formData.get("reminder_days_before")?.toString() ?? "",
    ),
    overdue_days_after: parseDays(
      formData.get("overdue_days_after")?.toString() ?? "",
    ),
    quiet_hours_start: formData.get("quiet_hours_start")?.toString() || null,
    quiet_hours_end: formData.get("quiet_hours_end")?.toString() || null,
  };

  try {
    await updateNotifications(patch);
    revalidatePath("/settings/notifications");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not save notifications." };
    }
    return { error: "Could not save notifications." };
  }
}
