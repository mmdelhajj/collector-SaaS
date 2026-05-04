"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { loginRequest, setAuthCookie } from "@/lib/auth";
import {
  clearChallenge,
  readChallenge,
  setChallenge,
} from "@/lib/two-factor-challenge";

const schema = z.object({
  email: z.string().email().max(255).optional(),
  password: z.string().min(8).max(255).optional(),
  remember: z.boolean().optional(),
  two_factor_code: z.string().optional(),
  recovery_code: z.string().optional(),
});

export type LoginActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  needsTwoFactor?: boolean;
};

export async function loginAction(
  _prev: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = schema.safeParse({
    email: formData.get("email") || undefined,
    password: formData.get("password") || undefined,
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

  // Resolve credentials. On the FIRST submit the user types email+password.
  // On a 2FA-code submit they only type the 6-digit code; we pull email +
  // password from a short-lived encrypted server cookie (see
  // `lib/two-factor-challenge.ts`) so the plaintext password never lands
  // in the action's response state and never crosses to the browser.
  let email = parsed.data.email;
  let password = parsed.data.password;
  const twoFactorCode = parsed.data.two_factor_code;
  const recoveryCode = parsed.data.recovery_code;

  if (twoFactorCode || recoveryCode) {
    const challenge = await readChallenge();
    if (!challenge) {
      return {
        error: "Your 2FA challenge expired — please re-enter your password.",
      };
    }
    email = challenge.email;
    password = challenge.password;
  }

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const res = await loginRequest({
      email,
      password,
      deviceName: "Web Admin",
      twoFactorCode,
      recoveryCode,
    });
    await setAuthCookie(res.token, res.expires_at);
    // Clean up any 2FA challenge cookie now that we've fully authenticated.
    await clearChallenge();
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
          // Stash credentials in an encrypted server cookie keyed to /login
          // so the next submit can finish the flow without re-typing them
          // and without round-tripping the password through the client.
          await setChallenge({ email, password });
          return {
            needsTwoFactor: true,
            error:
              twoFactorCode || recoveryCode
                ? "Code is invalid or expired. Try again."
                : undefined,
          };
        }
      }
      if (err.status === 422 || err.status === 401) {
        await clearChallenge();
        return { error: "Invalid email or password." };
      }
      if (err.status === 429) {
        await clearChallenge();
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
