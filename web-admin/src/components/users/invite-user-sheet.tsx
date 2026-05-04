"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Copy, Loader2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  inviteUserAction,
  type InviteState,
} from "@/app/(dashboard)/settings/users/actions";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  TENANT_ROLES,
} from "@/lib/users-types";

type InviteUserSheetProps = {
  /** Pre-select a role (e.g. "collector" when invoked from /collectors). */
  defaultRole?: (typeof TENANT_ROLES)[number];
  /** Override the trigger button label. */
  triggerLabel?: string;
  /** Override the sheet title. */
  title?: string;
};

export function InviteUserSheet({
  defaultRole = "manager",
  triggerLabel = "Invite user",
  title = "Invite a teammate",
}: InviteUserSheetProps = {}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    InviteState | undefined,
    FormData
  >(inviteUserAction, undefined);

  useEffect(() => {
    if (state?.ok && state.result) {
      toast.success(`${state.result.name} added`, {
        description: `Temporary password copied — share via secure channel.`,
      });
    }
  }, [state]);

  const fe = state?.fieldErrors ?? {};

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
        <Plus className="size-4" />
        {triggerLabel}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            They&rsquo;ll get a temporary password to share via secure channel.
            We&rsquo;ll add real email/SMS invites in a follow-up.
          </SheetDescription>
        </SheetHeader>

        {state?.ok && state.result ? (
          <SuccessPanel
            email={state.result.email}
            name={state.result.name}
            password={state.result.temporaryPassword}
            onClose={() => setOpen(false)}
          />
        ) : (
          <form
            action={formAction}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2"
          >
            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <Field
              label="Name"
              name="name"
              placeholder="Layla Nasser"
              required
              errors={fe.name}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="layla@yourcompany.com"
              required
              errors={fe.email}
            />
            <Field
              label="Phone"
              name="phone"
              type="tel"
              placeholder="+96170123456"
              errors={fe.phone}
            />

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue={defaultRole}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TENANT_ROLES.filter((r) => r !== "customer").map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <RoleHint />
              {fe.role?.[0] && (
                <p className="text-xs text-destructive">{fe.role[0]}</p>
              )}
            </div>

            <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t px-0 pt-4">
              <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
                Cancel
              </SheetClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Inviting…
                  </>
                ) : (
                  "Send invite"
                )}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RoleHint() {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-3 shrink-0" />
      <span>
        Roles control what each user can do. See{" "}
        <span className="font-medium text-foreground">Settings → Roles</span>{" "}
        for the full permission grid.
      </span>
    </p>
  );
}

function SuccessPanel({
  name,
  email,
  password,
  onClose,
}: {
  name: string;
  email: string;
  password: string;
  onClose: () => void;
}) {
  function copy() {
    navigator.clipboard
      .writeText(password)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy"));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
      <div className="rounded-xl border bg-emerald-50/50 p-4 dark:bg-emerald-950/30">
        <p className="text-sm font-semibold">{name} added</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{email}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Temporary password
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted/50 px-3 py-2 font-mono text-sm">
            {password}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copy}
            aria-label="Copy password"
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Share with the user via WhatsApp, Signal, or another secure channel —
          <span className="font-medium text-foreground"> never email it</span>.
          They should change it after first sign-in.
        </p>
      </div>

      <SheetFooter className="mt-auto flex-row justify-end border-t px-0 pt-4">
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </SheetFooter>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  errors?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(errors?.length)}
      />
      {errors?.[0] && <p className="text-xs text-destructive">{errors[0]}</p>}
    </div>
  );
}
