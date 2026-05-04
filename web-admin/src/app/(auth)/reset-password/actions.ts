"use server";

import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api";

const schema = z
  .object({
    email: z.string().email().max(255),
    token: z.string().min(1),
    password: z.string().min(8).max(255),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match.",
  });

export type ResetPasswordState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function resetPasswordAction(
  _prev: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    password: formData.get("password"),
    password_confirmation: formData.get("password_confirmation"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      (fieldErrors[path] ??= []).push(issue.message);
    }
    return { error: "Please check the form below.", fieldErrors };
  }

  try {
    const res = await apiFetch<{ message: string }>(
      "/api/v1/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify(parsed.data),
        authenticated: false,
      },
    );
    return { ok: true, message: res.message };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (err.status === 422) {
        return {
          error: body?.message ?? "This link is invalid or has expired.",
          fieldErrors: body?.errors,
        };
      }
      if (err.status === 429) {
        return { error: "Too many requests. Try again in a few minutes." };
      }
    }
    return { error: "Something went wrong. Please try again." };
  }
}
