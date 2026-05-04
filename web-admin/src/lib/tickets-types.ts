export const TICKET_TYPES = [
  "install",
  "repair",
  "disconnect",
  "support",
] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = [
  "open",
  "scheduled",
  "in_progress",
  "done",
  "cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type Ticket = {
  id: number;
  number: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  photos: string[];
  materials_used: unknown[];
  customer: {
    id: string;
    code: string;
    full_name: string;
    phone_primary: string | null;
    address_line: string | null;
    city: string | null;
  } | null;
  assigned_to: { id: number; name: string } | null;
  created_at: string | null;
  updated_at: string | null;
};
