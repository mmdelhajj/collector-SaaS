"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { recordPayment, refundPayment, PAYMENT_METHODS } from "@/lib/payments";

const recordSchema = z.object({
  customer_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  reference_number: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export type RecordPaymentState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  payment?: { id: string; amount: number; customerName: string };
};

export async function recordPaymentAction(
  _prev: RecordPaymentState | undefined,
  formData: FormData,
): Promise<RecordPaymentState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { error: "Please check the form below.", fieldErrors };
  }

  const data = parsed.data;
  try {
    const res = await recordPayment({
      customer_id: data.customer_id,
      invoice_id: data.invoice_id || null,
      amount: data.amount,
      method: data.method,
      reference_number: data.reference_number || null,
      notes: data.notes || null,
    });
    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath("/customers");
    return {
      ok: true,
      payment: {
        id: res.data.id,
        amount: res.data.amount,
        customerName: res.data.customer?.full_name ?? "",
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (err.status === 422)
        return {
          error: body.message ?? "Validation failed.",
          fieldErrors: body.errors,
        };
      if (err.status === 403)
        return { error: "You don't have permission to record payments." };
    }
    return { error: "Could not record payment. Please try again." };
  }
}

export type RefundState = { ok?: boolean; error?: string };

export async function refundPaymentAction(
  paymentId: string,
): Promise<RefundState> {
  try {
    await refundPayment(paymentId);
    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath("/customers");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403)
        return { error: "You don't have permission to issue refunds." };
      if (err.status === 409)
        return { error: "Only completed payments can be refunded." };
    }
    return { error: "Could not refund payment." };
  }
}
