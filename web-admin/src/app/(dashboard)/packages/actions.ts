"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import {
  createPackage,
  updatePackage,
  deletePackage,
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

const updateSchema = schema.partial();

export type UpdatePackageState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  pkg?: { id: number; name: string };
};

export async function updatePackageAction(
  id: number,
  _prev: UpdatePackageState | undefined,
  formData: FormData,
): Promise<UpdatePackageState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  raw.is_active = formData.get("is_active") === "on" ? "true" : "false";

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { error: "Please check the form below.", fieldErrors };
  }

  const data = parsed.data;
  // Build payload from only-defined keys; coerce empty strings to null
  // for nullable columns so clearing a field actually clears it.
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.code !== undefined) payload.code = data.code;
  if (data.description !== undefined)
    payload.description = data.description || null;
  if (data.billing_type !== undefined) payload.billing_type = data.billing_type;
  if (data.billing_period !== undefined)
    payload.billing_period = data.billing_period;
  if (data.price !== undefined) payload.price = data.price;
  if (data.currency !== undefined) payload.currency = data.currency || "USD";
  if (data.speed_down_mbps !== undefined)
    payload.speed_down_mbps =
      typeof data.speed_down_mbps === "number" ? data.speed_down_mbps : null;
  if (data.speed_up_mbps !== undefined)
    payload.speed_up_mbps =
      typeof data.speed_up_mbps === "number" ? data.speed_up_mbps : null;
  if (data.radius_group_name !== undefined)
    payload.radius_group_name = data.radius_group_name || null;
  if (data.is_active !== undefined) payload.is_active = data.is_active;

  try {
    const res = await updatePackage(id, payload);
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
      if (err.status === 404) return { error: "Package no longer exists." };
    }
    return { error: "Could not update package. Please try again." };
  }
}

export async function deletePackageAction(
  id: number,
): Promise<{ ok: boolean; error?: string; subscriptionsCount?: number }> {
  try {
    await deletePackage(id);
    revalidatePath("/packages");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        message?: string;
        subscriptions_count?: number;
      };
      // Backend returns 409 when there are active subscriptions on the
      // package — surface the count so the UI can say "12 active customers
      // depend on this — reassign them first."
      if (err.status === 409) {
        return {
          ok: false,
          error: body.message ?? "Package has active subscriptions.",
          subscriptionsCount: body.subscriptions_count,
        };
      }
      if (err.status === 404)
        return { ok: false, error: "Package no longer exists." };
    }
    return { ok: false, error: "Could not delete package." };
  }
}
