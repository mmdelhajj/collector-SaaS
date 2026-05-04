export const MESSAGE_CHANNELS = ["whatsapp", "sms", "email"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export type MessageLog = {
  id: number;
  channel: MessageChannel;
  template_key: string | null;
  to_address: string;
  status: MessageStatus;
  provider: string | null;
  provider_message_id: string | null;
  cost: number | null;
  error: string | null;
  related_type: string | null;
  related_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  customer?: {
    id: string;
    code: string;
    full_name: string;
  } | null;
  created_at: string | null;
};
