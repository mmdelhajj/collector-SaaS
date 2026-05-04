"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { loginRequest, setAuthCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  remember: z.boolean().optional(),
  two_factor_code: z.string().optional(),
  recovery_code: z.string().optional(),
});

export type LoginActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  needsTwoFactor?: boolean;
  email?: string;
  password?: string;
};

export async function loginAction(
  _prev: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
    two_factor_code: formData.get("two_factor_code") || undefined,
    recovery_code: formData.get("recovery_code") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { error: "Please check the form and try again.", fieldErrors };
  }

  try {
    const res = await loginRequest({
      email: parsed.data.email,
      password: parsed.data.password,
      deviceName: "Web Admin",
      twoFactorCode: parsed.data.two_factor_code,
      recoveryCode: parsed.data.recovery_code,
    });
    await setAuthCookie(res.token, res.expires_at);
  } catch (err) {
    if (err instanceof ApiError) {
      // Check for 2FA challenge first.
      if (err.status === 422) {
        const body = err.body as {
          errors?: Record<string, string[]>;
          message?: string;
        };
        const fe = body?.errors ?? {};
        if (fe.two_factor_code?.[0] === "two_factor_required") {
          return {
            needsTwoFactor: true,
            email: parsed.data.email,
            password: parsed.data.password,
            error:
              parsed.data.two_factor_code || parsed.data.recovery_code
                ? "Code is invalid or expired. Try again."
                : undefined,
          };
        }
      }
      if (err.status === 422 || err.status === 401) {
        return { error: "Invalid email or password." };
      }
      if (err.status === 429) {
        return {
          error: "Too many attempts. Please wait 15 minutes and try again.",
        };
      }
    }
    return { error: "Something went wrong. Please try again." };
  }

  // Bounce super-admins to the platform panel; everyone else to /dashboard.
  const { getCurrentTenant } = await import("@/lib/auth");
  const tenant = await getCurrentTenant();
  if (tenant === null) {
    redirect("/super-admin");
  }
  redirect("/dashboard");
}
