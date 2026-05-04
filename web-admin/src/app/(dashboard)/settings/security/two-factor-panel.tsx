"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmAction, disableAction, enrollAction } from "./actions";

type Stage = "idle" | "enrolled" | "active";

export function TwoFactorPanel({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [stage, setStage] = useState<Stage>(initialEnabled ? "active" : "idle");
  const [qrSvg, setQrSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleEnroll() {
    startTransition(async () => {
      const res = await enrollAction();
      if (res.ok) {
        setQrSvg(res.qr_svg);
        setSecret(res.secret);
        setCode("");
        setRecoveryCodes([]);
        setStage("enrolled");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleConfirm() {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    startTransition(async () => {
      const res = await confirmAction(code);
      if (res.ok) {
        toast.success("Two-factor enabled");
        setRecoveryCodes(res.recovery_codes);
        setStage("active");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDisable() {
    if (!disablePassword && !disableCode) {
      toast.error("Enter your password or a current TOTP code");
      return;
    }
    const fd = new FormData();
    if (disablePassword) fd.append("password", disablePassword);
    if (disableCode) fd.append("code", disableCode);
    startTransition(async () => {
      const res = await disableAction(fd);
      if (res.ok) {
        toast.success("Two-factor disabled");
        setStage("idle");
        setRecoveryCodes([]);
        setShowDisableForm(false);
        setDisablePassword("");
        setDisableCode("");
      } else {
        toast.error(res.error ?? "Could not disable");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <header className="flex items-start gap-3">
          <span
            className={`flex size-9 items-center justify-center rounded-lg ring-1 ring-inset ${
              stage === "active"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                : "bg-muted text-muted-foreground ring-border"
            }`}
          >
            <ShieldCheck className="size-4" />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Authenticator app (TOTP)</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Use Google Authenticator, Authy, 1Password, or any TOTP app. Codes
              change every 30 seconds.
            </p>
          </div>
          {stage === "active" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
              <CheckCircle2 className="size-3" />
              Enabled
            </span>
          )}
        </header>

        <div className="mt-4 space-y-4">
          {stage === "idle" && (
            <Button type="button" onClick={handleEnroll} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Enable two-factor"
              )}
            </Button>
          )}

          {stage === "enrolled" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step 1 — Scan this QR code
                </p>
                <div className="mt-3 flex justify-center bg-white p-4">
                  {/* Render the QR as a data URL inside an <img> so the SVG
                      cannot run any inline <script> if the upstream renderer
                      is ever swapped or compromised. dangerouslySetInnerHTML
                      would expose us to that. */}
                  {qrSvg && (
                    <img
                      alt="2FA QR code"
                      width={220}
                      height={220}
                      src={`data:image/svg+xml;base64,${typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(qrSvg))) : ""}`}
                    />
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Or enter the secret manually:
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-card px-3 py-1.5 font-mono text-xs">
                    {secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(secret);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="totp-code">
                  Step 2 — Enter the 6-digit code from your app
                </Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="text-center text-lg font-mono tracking-widest"
                  placeholder="000000"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStage("idle")}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify and enable"
                  )}
                </Button>
              </div>
            </div>
          )}

          {stage === "active" && (
            <div className="space-y-4">
              {recoveryCodes.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                    <div className="text-xs">
                      <p className="font-semibold text-amber-900 dark:text-amber-300">
                        Save these recovery codes
                      </p>
                      <p className="mt-1 text-amber-800 dark:text-amber-300/90">
                        Each can be used once if you lose your authenticator. We
                        won&rsquo;t show them again.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {recoveryCodes.map((rc) => (
                      <code
                        key={rc}
                        className="rounded bg-white px-2 py-1 text-center font-mono text-xs dark:bg-zinc-900"
                      >
                        {rc}
                      </code>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      navigator.clipboard.writeText(recoveryCodes.join("\n"));
                      toast.success("Copied all");
                    }}
                  >
                    <Copy className="size-3.5" />
                    Copy all
                  </Button>
                </div>
              )}

              {!showDisableForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDisableForm(true)}
                  disabled={isPending}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <ShieldOff className="size-4" />
                  Disable two-factor
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                  <p className="text-xs font-semibold text-destructive">
                    Re-authenticate to disable 2FA
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enter your account password OR a current 6-digit code from
                    your authenticator. A stolen session token alone cannot turn
                    2FA off.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="disable-pw" className="text-xs">
                      Password
                    </Label>
                    <Input
                      id="disable-pw"
                      type="password"
                      autoComplete="current-password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Your account password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disable-code" className="text-xs">
                      Or 6-digit code
                    </Label>
                    <Input
                      id="disable-code"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={disableCode}
                      onChange={(e) =>
                        setDisableCode(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="123456"
                      className="font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleDisable}
                      disabled={isPending}
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <ShieldOff className="size-4" />
                      {isPending ? "Disabling…" : "Confirm disable"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowDisableForm(false);
                        setDisablePassword("");
                        setDisableCode("");
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
