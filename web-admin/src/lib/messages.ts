import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type {
  MessageChannel,
  MessageLog,
  MessageStatus,
} from "@/lib/messages-types";

export type { MessageChannel, MessageLog, MessageStatus } from "@/lib/messages-types";
export { MESSAGE_CHANNELS, MESSAGE_STATUSES } from "@/lib/messages-types";

export type MessagesListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  channel?: MessageChannel;
  status?: MessageStatus;
};

export async function listMessages(
  params: MessagesListParams = {},
): Promise<Paginated<MessageLog>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.channel) qs.set("filter[channel]", params.channel);
  if (params.status) qs.set("filter[status]", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<MessageLog>>(`/api/v1/messages${suffix}`);
}
