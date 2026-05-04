"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { bulkAssign } from "@/lib/collectors";
import { listCollectors } from "@/lib/users";

export type CollectorOption = { id: number; name: string };

export async function fetchCollectorsAction(): Promise<{
  ok: boolean;
  collectors?: CollectorOption[];
  error?: string;
}> {
  try {
    const list = await listCollectors();
    return {
      ok: true,
      collectors: list.map((u) => ({ id: u.id, name: u.name })),
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401)
      return { ok: false, error: "Session expired." };
    return { ok: false, error: "Could not load collectors." };
  }
}

export type BulkAssignResultState = {
  ok?: boolean;
  error?: string;
  result?: { assigned: number; skipped: number; collectorName: string };
};

export async function bulkAssignAction(
  collectorUserId: number,
  collectorName: string,
  invoiceIds: string[],
  priority: number,
  useOrder = false,
): Promise<BulkAssignResultState> {
  if (invoiceIds.length === 0) {
    return { error: "Select at least one invoice." };
  }
  try {
    const res = await bulkAssign({
      collector_user_id: collectorUserId,
      invoice_ids: invoiceIds,
      priority,
      use_order: useOrder,
    });
    revalidatePath("/invoices");
    revalidatePath("/collectors");
    revalidatePath("/my-route");
    return {
      ok: true,
      result: {
        assigned: res.assigned,
        skipped: res.skipped,
        collectorName,
      },
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403)
        return { error: "You don't have permission to assign collectors." };
      if (err.status === 422) return { error: "Invalid selection." };
    }
    return { error: "Could not assign invoices." };
  }
}
