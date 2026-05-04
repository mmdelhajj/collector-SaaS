"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { recordPayment } from "@/lib/payments";
import type { PaymentMethod } from "@/lib/payments-types";

export type RecordResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function recordPaymentAction(
  _prev: RecordResult | undefined,
  formData: FormData,
): Promise<RecordResult> {
  const customer_id = formData.get("customer_id")?.toString() ?? "";
  const invoice_id = formData.get("invoice_id")?.toString() || null;
  const amount = Number(formData.get("amount"));
  const method = formData.get("method")?.toString() as PaymentMethod;
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!customer_id || !Number.isFinite(amount) || amount <= 0 || !method) {
    return { error: "Enter a valid amount and method." };
  }

  try {
    await recordPayment({
      customer_id,
      invoice_id,
      amount,
      method,
      notes,
    });
    revalidatePath("/my-route");
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      return {
        error: body.message ?? "Could not record payment.",
        fieldErrors: body.errors,
      };
    }
    return { error: "Could not record payment." };
  }

  redirect("/my-route?recorded=1");
}
