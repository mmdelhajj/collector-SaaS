"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, type SignupActionState } from "./actions";

type Plan = {
  code: "starter" | "growth" | "pro";
  name: string;
  price_monthly: number;
};

export function SignupForm({
  plans,
  initialPlan,
}: {
  plans: Plan[];
  initialPlan: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const [state, formAction, isPending] = useActionState<
    SignupActionState | undefined,
    FormData
  >(signupAction, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="company_name">Company name</Label>
        <Input
          id="company_name"
          name="company_name"
          placeholder="Acme ISP"
          required
          aria-invalid={Boolean(fe.company_name)}
        />
        {fe.company_name?.[0] && (
          <p className="text-xs text-destructive">{fe.company_name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          placeholder="John Smith"
          required
          aria-invalid={Boolean(fe.name)}
        />
        {fe.name?.[0] && (
          <p className="text-xs text-destructive">{fe.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@yourcompany.com"
          required
          aria-invalid={Boolean(fe.email)}
        />
        {fe.email?.[0] && (
          <p className="text-xs text-destructive">{fe.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            className="pr-10"
            aria-invalid={Boolean(fe.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {fe.password?.[0] && (
          <p className="text-xs text-destructive">{fe.password[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Plan</Label>
        <input type="hidden" name="plan" value={plan} />
        <div className="grid grid-cols-3 gap-2">
          {plans.map((p) => {
            const active = plan === p.code;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setPlan(p.code)}
                className={`rounded-lg border p-2.5 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/40"
                }`}
              >
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  ${p.price_monthly}/mo
                </p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          14 days free on every plan. You won&rsquo;t be charged until day 15.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creating workspace…
          </>
        ) : (
          "Create my workspace"
        )}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        By continuing, you agree to our terms and privacy policy.
      </p>
    </form>
  );
}
