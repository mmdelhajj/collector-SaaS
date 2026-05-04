"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  createTicket,
  updateTicket,
  type TicketCreate,
  type TicketPatch,
} from "@/lib/tickets";

export type TicketActionResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ticketId?: number;
};

export async function createTicketAction(
  payload: TicketCreate,
): Promise<TicketActionResult> {
  try {
    const res = await createTicket(payload);
    revalidatePath("/tickets");
    return { ok: true, ticketId: res.data.id };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as {
        errors?: Record<string, string[]>;
        message?: string;
      };
      return {
        error: b?.message ?? "Could not create ticket.",
        fieldErrors: b?.errors,
      };
    }
    return { error: "Could not create ticket." };
  }
}

export async function updateTicketAction(
  id: number,
  patch: TicketPatch,
): Promise<TicketActionResult> {
  try {
    await updateTicket(id, patch);
    revalidatePath("/tickets");
    return { ok: true, ticketId: id };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as {
        errors?: Record<string, string[]>;
        message?: string;
      };
      return {
        error: b?.message ?? "Could not update ticket.",
        fieldErrors: b?.errors,
      };
    }
    return { error: "Could not update ticket." };
  }
}
