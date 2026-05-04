export const TEMPLATE_CHANNELS = ["whatsapp", "sms", "email"] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export const TEMPLATE_LOCALES = ["en", "ar", "fr"] as const;
export type TemplateLocale = (typeof TEMPLATE_LOCALES)[number];

export const TEMPLATE_KEYS = [
  { key: "payment_received", label: "Payment received" },
  { key: "invoice_created", label: "Invoice issued" },
  { key: "invoice_reminder", label: "Reminder before due" },
  { key: "invoice_overdue", label: "Overdue notice" },
  { key: "service_suspended", label: "Service suspended" },
  { key: "service_reactivated", label: "Service reactivated" },
  { key: "collector_assigned", label: "Collector assigned" },
] as const;

export type MessageTemplate = {
  id: number;
  key: string;
  channel: TemplateChannel;
  locale: TemplateLocale;
  subject: string | null;
  body: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};
