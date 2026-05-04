"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  changePassword,
  deleteAvatar,
  updateProfile,
  uploadAvatar,
  type UpdateProfilePayload,
} from "@/lib/profile";

type Result<T = unknown> = { ok?: boolean; error?: string; data?: T };

function describe(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const b = err.body as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (b?.errors) {
      // Surface the first per-field error so the user gets an actionable
      // message even when the generic `message` is "Validation failed".
      const first = Object.values(b.errors)[0]?.[0];
      if (first) return first;
    }
    if (b?.message) return b.message;
  }
  return fallback;
}

export async function saveProfileAction(
  payload: UpdateProfilePayload,
): Promise<Result> {
  try {
    await updateProfile(payload);
    revalidatePath("/profile");
    revalidatePath("/super-admin/profile");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not save profile.") };
  }
}

export async function changePasswordAction(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<Result> {
  try {
    await changePassword(payload);
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not change password.") };
  }
}

export async function uploadAvatarAction(formData: FormData): Promise<Result> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick an image first." };
  }
  try {
    await uploadAvatar(file);
    revalidatePath("/profile");
    revalidatePath("/super-admin/profile");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Upload failed.") };
  }
}

export async function deleteAvatarAction(): Promise<Result> {
  try {
    await deleteAvatar();
    revalidatePath("/profile");
    revalidatePath("/super-admin/profile");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: describe(err, "Could not remove avatar.") };
  }
}
