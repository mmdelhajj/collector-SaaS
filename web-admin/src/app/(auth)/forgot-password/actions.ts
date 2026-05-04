"use server";

import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api";

const schema = z.object({
  email: z.string().email().max(255),
});

export type ForgotPasswordState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function forgotPasswordAction(
  _prev: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { error: "Please enter a valid email.", fieldErrors };
  }

  try {
    const res = await apiFetch<{ message: string }>(
      "/api/v1/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email: parsed.data.email }),
        authenticated: false,
      },
    );
    return { ok: true, message: res.message };
  } catch (err) {
    // Backend's contract is to always return 200 (even when the email
    // doesn't match an account) so we don't leak account existence.
    // Anything other than 200 is therefore a real failure.
    if (err instanceof ApiError && err.status === 429) {
      return {
        error: "Too many requests. Try again in a few minutes.",
      };
    }
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}
