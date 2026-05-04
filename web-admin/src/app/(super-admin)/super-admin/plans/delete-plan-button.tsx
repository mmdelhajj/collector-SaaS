"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePlanAction } from "./actions";

export function DeletePlanButton({
  id,
  name,
  tenantsCount,
}: {
  id: number;
  name: string;
  tenantsCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const blocked = tenantsCount > 0;

  function handle() {
    if (blocked) {
      toast.error(
        `Move ${tenantsCount} tenant${tenantsCount === 1 ? "" : "s"} off this plan first.`,
      );
      return;
    }
    if (!confirm(`Delete the "${name}" plan? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deletePlanAction(id);
      if (res.ok) toast.success(`${name} deleted`);
      else toast.error(res.error ?? "Could not delete");
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={isPending || blocked}
      title={
        blocked ? `${tenantsCount} tenants still on this plan` : "Delete plan"
      }
      className="gap-1.5 text-rose-700 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-40"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      Delete
    </Button>
  );
}
