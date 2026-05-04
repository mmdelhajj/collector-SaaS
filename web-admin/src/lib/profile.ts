import "server-only";
import { apiFetch } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";

export type UpdateProfilePayload = Partial<{
  name: string;
  email: string;
  phone: string | null;
  locale: "en" | "ar" | "fr";
  timezone: string;
}>;

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<CurrentUser> {
  const res = await apiFetch<{ user: CurrentUser }>("/api/v1/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.user;
}

export async function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<CurrentUser> {
  const res = await apiFetch<{ user: CurrentUser }>("/api/v1/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.user;
}

export async function uploadAvatar(file: File): Promise<CurrentUser> {
  const fd = new FormData();
  fd.append("avatar", file);
  const res = await apiFetch<{ user: CurrentUser }>("/api/v1/auth/avatar", {
    method: "POST",
    body: fd,
  });
  return res.user;
}

export async function deleteAvatar(): Promise<CurrentUser> {
  const res = await apiFetch<{ user: CurrentUser }>("/api/v1/auth/avatar", {
    method: "DELETE",
  });
  return res.user;
}
