"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  reactivateRadiusUserAction,
  suspendRadiusUserAction,
} from "@/app/(dashboard)/radius/actions";
import { SessionsSheet } from "@/components/radius/sessions-sheet";
import type { RadiusStatus } from "@/lib/radius-types";

export function RadiusRowActions({
  id,
  status,
  username,
}: {
  id: number;
  status: RadiusStatus;
  username: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function suspend() {
    startTransition(async () => {
      const res = await suspendRadiusUserAction(id);
      if (res.ok) {
        toast.success(`${username} suspended`, {
          description: "CoA dispatched — session will drop on next reauth.",
        });
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not suspend.");
      }
    });
  }

  function reactivate() {
    startTransition(async () => {
      const res = await reactivateRadiusUserAction(id);
      if (res.ok) {
        toast.success(`${username} reactivated`, {
          description: "CoA disconnect sent — they'll reauth and reconnect.",
        });
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not reactivate.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <SessionsSheet radiusUserId={id} username={username} />
      {status === "active" && (
        <Button
          size="sm"
          variant="outline"
          onClick={suspend}
          disabled={isPending}
          className="h-7 px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          {isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Pause className="size-3" />
          )}
          Suspend
        </Button>
      )}
      {status === "suspended" && (
        <Button
          size="sm"
          onClick={reactivate}
          disabled={isPending}
          className="h-7 px-2 text-xs"
        >
          {isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          Reactivate
        </Button>
      )}
    </div>
  );
}
