"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  testSmtp,
  updateBranding,
  updateDefaults,
  updateSmtp,
} from "@/lib/super-admin";

type Result = { ok?: boolean; error?: string };

export async function saveSmtpAction(payload: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: "tls" | "ssl" | "none";
  from_address: string;
  from_name: string;
}): Promise<Result> {
  try {
    await updateSmtp(payload);
    revalidatePath("/super-admin/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not save SMTP." };
    }
    return { error: "Could not save SMTP." };
  }
}

export async function saveBrandingAction(payload: {
  platform_name: string;
  support_email?: string;
  logo_url?: string;
  tagline?: string;
}): Promise<Result> {
  try {
    await updateBranding(payload);
    revalidatePath("/super-admin/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not save branding." };
    }
    return { error: "Could not save branding." };
  }
}

export async function saveDefaultsAction(payload: {
  default_trial_days: number;
  default_signup_plan: "starter" | "growth" | "pro";
  allow_public_signup: boolean;
}): Promise<Result> {
  try {
    await updateDefaults(payload);
    revalidatePath("/super-admin/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not save defaults." };
    }
    return { error: "Could not save defaults." };
  }
}

export async function testSmtpAction(
  to: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    return await testSmtp(to);
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { ok: false, message: b?.message ?? "Test failed." };
    }
    return { ok: false, message: "Test failed." };
  }
}
