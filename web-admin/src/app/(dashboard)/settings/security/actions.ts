"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  confirmTwoFactor,
  disableTwoFactor,
  enrollTwoFactor,
} from "@/lib/two-factor";

export type EnrollResult =
  | { ok: true; secret: string; otpauth_url: string; qr_svg: string }
  | { ok: false; error: string };

export async function enrollAction(): Promise<EnrollResult> {
  try {
    const data = await enrollTwoFactor();
    return { ok: true, ...data };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { ok: false, error: b?.message ?? "Could not start enrolment." };
    }
    return { ok: false, error: "Could not start enrolment." };
  }
}

export type ConfirmResult =
  | { ok: true; recovery_codes: string[] }
  | { ok: false; error: string };

export async function confirmAction(code: string): Promise<ConfirmResult> {
  try {
    const data = await confirmTwoFactor(code);
    revalidatePath("/settings/security");
    return { ok: true, recovery_codes: data.recovery_codes };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { ok: false, error: b?.message ?? "Code is invalid." };
    }
    return { ok: false, error: "Code is invalid." };
  }
}

export async function disableAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    await disableTwoFactor();
    revalidatePath("/settings/security");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { ok: false, error: b?.message ?? "Could not disable." };
    }
    return { ok: false, error: "Could not disable." };
  }
}
