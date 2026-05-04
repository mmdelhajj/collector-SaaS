import "server-only";
import { apiFetch } from "@/lib/api";
import type { Paginated } from "@/lib/customers-types";
import type {
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/lib/tickets-types";

export type TicketListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: TicketStatus;
  type?: TicketType;
  priority?: TicketPriority;
  assignedTo?: number;
};

export async function listTickets(
  params: TicketListParams = {},
): Promise<Paginated<Ticket>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("per_page", String(params.perPage));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("filter[status]", params.status);
  if (params.type) qs.set("filter[type]", params.type);
  if (params.priority) qs.set("filter[priority]", params.priority);
  if (params.assignedTo)
    qs.set("filter[assigned_to_user_id]", String(params.assignedTo));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Paginated<Ticket>>(`/api/v1/tickets${suffix}`);
}

export type TicketCreate = {
  customer_id: string;
  type: TicketType;
  priority?: TicketPriority;
  title: string;
  description?: string;
  scheduled_at?: string | null;
  assigned_to_user_id?: number | null;
};

export async function createTicket(
  payload: TicketCreate,
): Promise<{ data: Ticket }> {
  return apiFetch<{ data: Ticket }>("/api/v1/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type TicketPatch = Partial<{
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  scheduled_at: string | null;
  completed_at: string | null;
  assigned_to_user_id: number | null;
}>;

export async function updateTicket(
  id: number,
  patch: TicketPatch,
): Promise<{ data: Ticket }> {
  return apiFetch<{ data: Ticket }>(`/api/v1/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
