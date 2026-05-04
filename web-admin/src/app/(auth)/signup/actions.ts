"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api";
import { setAuthCookie } from "@/lib/auth";

const schema = z.object({
  company_name: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(120),
  plan: z.enum(["starter", "growth", "pro"]),
});

export type SignupActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type SignupResponse = {
  tenant: { id: string; name: string; slug: string; plan: string };
  user: { id: number; name: string; email: string };
  token: string;
  expires_at: string | null;
};

export async function signupAction(
  _prev: SignupActionState | undefined,
  formData: FormData,
): Promise<SignupActionState> {
  const parsed = schema.safeParse({
    company_name: formData.get("company_name"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    plan: formData.get("plan"),
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
    const res = await apiFetch<SignupResponse>("/api/v1/signup", {
      method: "POST",
      body: JSON.stringify(parsed.data),
      authenticated: false,
    });
    await setAuthCookie(res.token, res.expires_at);
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (err.status === 422)
        return {
          error: body.message ?? "Validation failed.",
          fieldErrors: body.errors,
        };
      if (err.status === 429)
        return {
          error: "Too many signups from this IP. Try again in an hour.",
        };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/dashboard?welcome=1");
}
