"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/lib/profile-actions";

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (next.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("New password and confirmation don't match");
      return;
    }
    startTransition(async () => {
      const res = await changePasswordAction({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      if (res.ok) {
        toast.success("Password changed");
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        toast.error(res.error ?? "Could not change password");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <header className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Change password</h2>
          <p className="text-xs text-muted-foreground">
            Min 8 characters. You'll need your current password to confirm.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cur">Current password</Label>
          <Input
            id="cur"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new">New password</Label>
          <Input
            id="new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cnf">Confirm new password</Label>
          <Input
            id="cnf"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button
          onClick={submit}
          disabled={isPending || !current || !next || !confirm}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Update password"
          )}
        </Button>
      </div>
    </section>
  );
}
