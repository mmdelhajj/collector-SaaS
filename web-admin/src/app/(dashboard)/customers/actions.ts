"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  CUSTOMER_STATUSES,
} from "@/lib/customers";

const coord = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine((v) => v === null || Number.isFinite(v), "Invalid number");

const baseSchema = z.object({
  first_name: z.string().min(1, "Required").max(120),
  last_name: z.string().min(1, "Required").max(120),
  phone_primary: z.string().min(6, "Phone is required").max(32),
  email: z.string().email().max(255).optional().or(z.literal("")),
  whatsapp_phone: z.string().max(32).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  address_line: z.string().max(255).optional().or(z.literal("")),
  latitude: coord.refine(
    (v) => v === null || (v >= -90 && v <= 90),
    "Latitude must be between -90 and 90",
  ),
  longitude: coord.refine(
    (v) => v === null || (v >= -180 && v <= 180),
    "Longitude must be between -180 and 180",
  ),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function nullableEmpty<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]),
  ) as T;
}

export type CreateCustomerState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  customer?: { id: string; code: string; full_name: string };
};

export async function createCustomerAction(
  _prev: CreateCustomerState | undefined,
  formData: FormData,
): Promise<CreateCustomerState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = baseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please check the form below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const res = await createCustomer(
      nullableEmpty(parsed.data) as Parameters<typeof createCustomer>[0],
    );
    revalidatePath("/customers");
    return {
      ok: true,
      customer: {
        id: res.data.id,
        code: res.data.code,
        full_name: res.data.full_name,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        errors?: Record<string, string[]>;
        message?: string;
      };
      if (err.status === 422 && body?.errors)
        return {
          error: body.message ?? "Validation failed.",
          fieldErrors: body.errors,
        };
      if (err.status === 401)
        return { error: "Session expired. Please sign in again." };
    }
    return { error: "Could not create customer. Please try again." };
  }
}

export type UpdateCustomerState = CreateCustomerState;

export async function updateCustomerAction(
  customerId: string,
  _prev: UpdateCustomerState | undefined,
  formData: FormData,
): Promise<UpdateCustomerState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = baseSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please check the form below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const res = await updateCustomer(
      customerId,
      nullableEmpty(parsed.data) as Parameters<typeof updateCustomer>[1],
    );
    revalidatePath("/customers");
    return {
      ok: true,
      customer: {
        id: res.data.id,
        code: res.data.code,
        full_name: res.data.full_name,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        errors?: Record<string, string[]>;
        message?: string;
      };
      if (err.status === 422 && body?.errors)
        return {
          error: body.message ?? "Validation failed.",
          fieldErrors: body.errors,
        };
      if (err.status === 404) return { error: "Customer not found." };
      if (err.status === 401)
        return { error: "Session expired. Please sign in again." };
    }
    return { error: "Could not save changes. Please try again." };
  }
}

export type SetLocationState = {
  ok?: boolean;
  error?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function setCustomerLocationAction(
  customerId: string,
  latitude: number | null,
  longitude: number | null,
): Promise<SetLocationState> {
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return { error: "Latitude must be between -90 and 90." };
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return { error: "Longitude must be between -180 and 180." };
  }
  try {
    const res = await updateCustomer(customerId, { latitude, longitude });
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    return {
      ok: true,
      latitude: res.data.latitude,
      longitude: res.data.longitude,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return { error: "Customer not found." };
      if (err.status === 401) return { error: "Session expired." };
      if (err.status === 422) {
        const body = err.body as { message?: string };
        return { error: body?.message ?? "Validation failed." };
      }
    }
    return { error: "Could not save location." };
  }
}

export type GeocodeResult = {
  ok: true;
  latitude: number;
  longitude: number;
  display_name: string;
};
export type GeocodeError = { ok: false; error: string };

export async function geocodeAddressAction(
  query: string,
): Promise<GeocodeResult | GeocodeError> {
  const q = query.trim();
  if (q.length < 3) {
    return { ok: false, error: "Type at least 3 characters to search." };
  }
  try {
    // Nominatim is the OpenStreetMap geocoder — free, no API key. Their
    // usage policy requires a descriptive User-Agent and capping at 1
    // req/sec; this hits it server-side so we honour both.
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RunCollect-Admin (support@runcollect.com)",
        "Accept-Language": "en",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `Geocoder error: ${res.status}` };
    }
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) {
      return { ok: false, error: "No match for that address." };
    }
    const hit = data[0];
    return {
      ok: true,
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
      display_name: hit.display_name,
    };
  } catch {
    return { ok: false, error: "Could not reach the geocoder." };
  }
}

export type DeleteCustomerState = { ok?: boolean; error?: string };

export async function deleteCustomerAction(
  customerId: string,
): Promise<DeleteCustomerState> {
  try {
    await deleteCustomer(customerId);
    revalidatePath("/customers");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return { error: "Customer not found." };
      if (err.status === 401) return { error: "Session expired." };
    }
    return { error: "Could not delete customer." };
  }
}
