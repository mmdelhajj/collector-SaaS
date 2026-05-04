"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { updateAssignment } from "@/lib/collectors";
import type { AssignmentStatus, FailureReason } from "@/lib/collectors-types";

export type StatusUpdateState = { ok?: boolean; error?: string };

export async function updateAssignmentStatusAction(
  id: number,
  status: AssignmentStatus,
  failureReason?: FailureReason,
  failureNotes?: string | null,
): Promise<StatusUpdateState> {
  try {
    await updateAssignment(id, {
      status,
      failure_reason: failureReason ?? null,
      // Only include notes when status is failed — keeps the column clean.
      ...(status === "failed"
        ? { failure_notes: failureNotes?.trim() || null }
        : {}),
    });
    revalidatePath("/collectors");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403)
        return { error: "You don't have permission to change this." };
      if (err.status === 404) return { error: "Assignment not found." };
    }
    return { error: "Could not update assignment." };
  }
}
