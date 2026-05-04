"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  createZone,
  deleteZone,
  updateZone,
  type ZonePayload,
} from "@/lib/zones";

type Result = { ok?: boolean; error?: string; id?: number };

export async function createZoneAction(payload: ZonePayload): Promise<Result> {
  try {
    const res = await createZone(payload);
    revalidatePath("/settings/zones");
    return { ok: true, id: res.data.id };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not create zone." };
    }
    return { error: "Could not create zone." };
  }
}

export async function updateZoneAction(
  id: number,
  patch: Partial<ZonePayload>,
): Promise<Result> {
  try {
    await updateZone(id, patch);
    revalidatePath("/settings/zones");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not update zone." };
    }
    return { error: "Could not update zone." };
  }
}

export async function deleteZoneAction(id: number): Promise<Result> {
  try {
    await deleteZone(id);
    revalidatePath("/settings/zones");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      const b = err.body as { message?: string };
      return { error: b?.message ?? "Could not delete zone." };
    }
    return { error: "Could not delete zone." };
  }
}
