"use client";

import { useState, useTransition } from "react";
import { Cog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDefaultsAction } from "./actions";

type DefaultsInitial = {
  default_trial_days: number;
  default_signup_plan: "starter" | "growth" | "pro";
  allow_public_signup: boolean;
};

export function DefaultsForm({ initial }: { initial: DefaultsInitial }) {
  const [trialDays, setTrialDays] = useState(initial.default_trial_days);
  const [defaultPlan, setDefaultPlan] = useState(initial.default_signup_plan);
  const [allowPublic, setAllowPublic] = useState(initial.allow_public_signup);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveDefaultsAction({
        default_trial_days: trialDays,
        default_signup_plan: defaultPlan,
        allow_public_signup: allowPublic,
      });
      if (res.ok) toast.success("Defaults saved");
      else toast.error(res.error ?? "Save failed");
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <header className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Cog className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Signup defaults</h2>
          <p className="text-xs text-muted-foreground">
            What new tenants get when they sign up via the public form on{" "}
            <code>/signup</code>.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Default trial length (days)</Label>
          <Input
            type="number"
            min={0}
            max={365}
            value={trialDays}
            onChange={(e) => setTrialDays(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Default plan</Label>
          <select
            value={defaultPlan}
            onChange={(e) =>
              setDefaultPlan(e.target.value as "starter" | "growth" | "pro")
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-3">
        <input
          type="checkbox"
          checked={allowPublic}
          onChange={(e) => setAllowPublic(e.target.checked)}
          className="mt-0.5 size-4 rounded border"
        />
        <div className="flex-1">
          <p className="text-sm font-medium">Allow public signup</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When OFF, the <code>/signup</code> page is closed — only you (as
            super-admin) can create new tenants. Useful during private beta.
          </p>
        </div>
      </label>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Save defaults"
          )}
        </Button>
      </div>
    </section>
  );
}
