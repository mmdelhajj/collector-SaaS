"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  listRadiusSessions,
  reactivateRadiusUser,
  suspendRadiusUser,
  type RadiusSession,
} from "@/lib/radius";

export type RadiusActionState = { ok?: boolean; error?: string };

export async function suspendRadiusUserAction(
  id: number,
): Promise<RadiusActionState> {
  try {
    await suspendRadiusUser(id);
    revalidatePath("/radius");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403) return { error: "You don't have permission." };
      if (err.status === 404) return { error: "Subscriber not found." };
    }
    return { error: "Could not suspend." };
  }
}

export async function reactivateRadiusUserAction(
  id: number,
): Promise<RadiusActionState> {
  try {
    await reactivateRadiusUser(id);
    revalidatePath("/radius");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403) return { error: "You don't have permission." };
      if (err.status === 404) return { error: "Subscriber not found." };
    }
    return { error: "Could not reactivate." };
  }
}

export type SessionsResult = {
  ok?: boolean;
  error?: string;
  sessions?: RadiusSession[];
};

export async function fetchSessionsAction(id: number): Promise<SessionsResult> {
  try {
    const res = await listRadiusSessions(id);
    return { ok: true, sessions: res.data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { error: "Session expired." };
      if (err.status === 404) return { error: "Subscriber not found." };
    }
    return { error: "Could not load sessions." };
  }
}
