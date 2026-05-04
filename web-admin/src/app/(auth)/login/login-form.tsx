"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/i18n-provider";
import { loginAction, type LoginActionState } from "./actions";

export function LoginForm() {
  const t = useT();
  const [showPassword, setShowPassword] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [state, formAction, isPending] = useActionState<
    LoginActionState | undefined,
    FormData
  >(loginAction, undefined);

  const inTwoFactor = Boolean(state?.needsTwoFactor);

  if (inTwoFactor) {
    return (
      <form action={formAction} className="space-y-4">
        {/*
          Pre-fix: hidden inputs echoed back state.email + state.password from
          the action result. That meant the plaintext password was visible in
          the browser network tab and the React state tree. Now the server
          stashes credentials in an httpOnly encrypted cookie keyed to /login
          (see lib/two-factor-challenge.ts) and reads them back when the
          2FA-code submit lands. The browser never sees the password again.
        */}

        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Two-factor authentication is on. Enter the 6-digit code from your
            authenticator app.
          </span>
        </div>

        {state?.error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {!useRecovery ? (
          <div className="space-y-2">
            <Label htmlFor="two_factor_code">Authenticator code</Label>
            <Input
              id="two_factor_code"
              name="two_factor_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
              className="text-center text-lg font-mono tracking-widest"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="recovery_code">Recovery code</Label>
            <Input
              id="recovery_code"
              name="recovery_code"
              autoComplete="off"
              placeholder="XXXXXXXXXX"
              required
              autoFocus
              className="text-center font-mono"
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify"
          )}
        </Button>

        <button
          type="button"
          onClick={() => setUseRecovery((u) => !u)}
          className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <KeyRound className="size-3" />
          {useRecovery
            ? "Use authenticator code instead"
            : "Use a recovery code instead"}
        </button>
      </form>
    );
  }

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
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          aria-invalid={Boolean(state?.fieldErrors?.email)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <a
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            {t("auth.forgotPassword")}
          </a>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="pr-10"
            aria-invalid={Boolean(state?.fieldErrors?.password)}
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
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="remember" name="remember" />
        <Label
          htmlFor="remember"
          className="text-sm font-normal text-muted-foreground"
        >
          {t("auth.rememberMe")}
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("common.loading")}
          </>
        ) : (
          t("auth.signIn")
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Demo: <span className="font-mono">admin@demoisp.com</span> /{" "}
        <span className="font-mono">password</span>
      </p>
    </form>
  );
}
