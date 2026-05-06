"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { createInvoice } from "@/lib/invoices";

const itemSchema = z.object({
  description: z.string().min(1, "Required").max(255),
  quantity: z.coerce.number().min(0.01, "Must be > 0").default(1),
  unit_price: z.coerce.number().min(0, "Cannot be negative"),
});

const schema = z
  .object({
    customer_id: z.string().uuid("Pick a customer"),
    issued_at: z.string().min(1, "Issue date required"),
    due_at: z.string().min(1, "Due date required"),
    period_start: z.string().optional().or(z.literal("")),
    period_end: z.string().optional().or(z.literal("")),
    notes: z.string().max(5000).optional().or(z.literal("")),
    items: z.array(itemSchema).min(1, "Add at least one line item"),
  })
  .refine((d) => new Date(d.due_at) >= new Date(d.issued_at), {
    message: "Due date must be on or after issue date",
    path: ["due_at"],
  });

export type CreateInvoiceState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  invoice?: { id: string; number: string };
};

function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export async function createInvoiceAction(
  _prev: CreateInvoiceState | undefined,
  formData: FormData,
): Promise<CreateInvoiceState> {
  // Items are sent as JSON in a hidden field — easier than juggling
  // formData[items][N][description] tuples.
  const itemsJson = String(formData.get("items_json") ?? "[]");
  let items: unknown;
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { error: "Invalid line items payload." };
  }

  const raw = {
    customer_id: String(formData.get("customer_id") ?? ""),
    issued_at: String(formData.get("issued_at") ?? ""),
    due_at: String(formData.get("due_at") ?? ""),
    period_start: String(formData.get("period_start") ?? ""),
    period_end: String(formData.get("period_end") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    items,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please check the form below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const res = await createInvoice({
      customer_id: parsed.data.customer_id,
      issued_at: parsed.data.issued_at,
      due_at: parsed.data.due_at,
      period_start: parsed.data.period_start || null,
      period_end: parsed.data.period_end || null,
      notes: parsed.data.notes || null,
      items: parsed.data.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
      })),
    });
    revalidatePath("/invoices");
    return {
      ok: true,
      invoice: { id: res.data.id, number: res.data.number },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { error: "Session expired." };
      if (err.status === 403)
        return { error: "You don't have permission to create invoices." };
      if (err.status === 422) {
        const fieldErrors = (err.body as { errors?: Record<string, string[]> })
          ?.errors;
        return {
          error: "The server rejected the form.",
          fieldErrors: fieldErrors ?? undefined,
        };
      }
    }
    return { error: "Could not create the invoice. Please try again." };
  }
}
