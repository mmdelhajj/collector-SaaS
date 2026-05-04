"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import {
  createPackage,
  BILLING_PERIODS,
  BILLING_TYPES,
} from "@/lib/packages";

const schema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(64),
  description: z.string().max(2000).optional().or(z.literal("")),
  billing_type: z.enum(BILLING_TYPES),
  billing_period: z.enum(BILLING_PERIODS),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).optional().or(z.literal("")),
  speed_down_mbps: z.coerce.number().int().min(0).optional().or(z.literal("")),
  speed_up_mbps: z.coerce.number().int().min(0).optional().or(z.literal("")),
  radius_group_name: z.string().max(64).optional().or(z.literal("")),
  is_active: z.coerce.boolean().optional(),
});

export type CreatePackageState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  pkg?: { id: number; name: string };
};

export async function createPackageAction(
  _prev: CreatePackageState | undefined,
  formData: FormData,
): Promise<CreatePackageState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  // checkbox values come through as "on"/undefined; normalize to boolean string
  raw.is_active = formData.get("is_active") === "on" ? "true" : "false";

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { error: "Please check the form below.", fieldErrors };
  }

  const data = parsed.data;
  const payload = {
    name: data.name,
    code: data.code,
    description: data.description || null,
    billing_type: data.billing_type,
    billing_period: data.billing_period,
    price: data.price,
    currency: (data.currency as string) || "USD",
    speed_down_mbps:
      typeof data.speed_down_mbps === "number" ? data.speed_down_mbps : null,
    speed_up_mbps:
      typeof data.speed_up_mbps === "number" ? data.speed_up_mbps : null,
    radius_group_name: (data.radius_group_name as string) || null,
    is_active: data.is_active ?? true,
  };

  try {
    const res = await createPackage(payload);
    revalidatePath("/packages");
    return { ok: true, pkg: { id: res.data.id, name: res.data.name } };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (err.status === 422) {
        return {
          error: body.message ?? "Validation failed.",
          fieldErrors: body.errors,
        };
      }
      if (err.status === 401)
        return { error: "Session expired. Please sign in again." };
    }
    return { error: "Could not create package. Please try again." };
  }
}
