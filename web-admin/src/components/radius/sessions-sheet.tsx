"use client";

import { useState, useTransition } from "react";
import { History, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  fetchSessionsAction,
  type SessionsResult,
} from "@/app/(dashboard)/radius/actions";
import { cn } from "@/lib/utils";

type SessionsSheetProps = {
  radiusUserId: number;
  username: string;
};

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SessionsSheet({ radiusUserId, username }: SessionsSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SessionsResult | undefined>();
  const [isPending, startTransition] = useTransition();

  function load() {
    setState(undefined);
    startTransition(async () => {
      setState(await fetchSessionsAction(radiusUserId));
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) load();
      }}
    >
      <SheetTrigger
        className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Session history"
        aria-label={`Sessions for ${username}`}
      >
        <History className="size-3" />
        Sessions
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Sessions for {username}</SheetTitle>
          <SheetDescription>
            Last 50 sessions reported to your FreeRADIUS server. The newest row
            is at the top.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-2">
          {isPending && (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="me-2 size-4 animate-spin" /> Loading…
            </div>
          )}

          {!isPending && state?.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {!isPending && state?.ok && state.sessions && (
            <>
              {state.sessions.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No sessions on record.
                </div>
              ) : (
                <ul className="divide-y border-y">
                  {state.sessions.map((s) => {
                    const live = s.ended_at == null;
                    return (
                      <li key={s.id} className="py-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                              live
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                : "bg-zinc-100 text-zinc-600 ring-zinc-600/20",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                live ? "bg-emerald-500" : "bg-zinc-400",
                              )}
                            />
                            {live ? "Live" : "Closed"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(s.started_at)}
                            {s.ended_at && " → "}
                            {s.ended_at && formatDateTime(s.ended_at)}
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                          <Field
                            label="Duration"
                            value={formatDuration(s.duration_seconds)}
                          />
                          <Field label="Down" value={formatBytes(s.bytes_in)} />
                          <Field label="Up" value={formatBytes(s.bytes_out)} />
                          <Field
                            label="Cause"
                            value={s.terminate_cause ?? "—"}
                          />
                          <Field label="NAS IP" value={s.nas_ip ?? "—"} mono />
                          <Field
                            label="Framed IP"
                            value={s.framed_ip ?? "—"}
                            mono
                          />
                          <Field
                            label="Session ID"
                            value={s.session_id}
                            mono
                            className="col-span-2"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("truncate", mono && "font-mono text-[11px]")}>
        {value}
      </span>
    </div>
  );
}
