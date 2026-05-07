"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
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
  changeRoleAction,
  deleteUserAction,
  listInheritorCandidatesAction,
  resetPasswordAction,
  toggleActiveAction,
  type InheritorOption,
} from "@/app/(dashboard)/settings/users/actions";
import { ROLE_LABELS, TENANT_ROLES, type TenantRole } from "@/lib/users-types";
import { cn } from "@/lib/utils";

export function UserRowActions({
  userId,
  userName,
  isSelf,
  isActive,
  currentRole,
}: {
  userId: number;
  userName?: string;
  isSelf: boolean;
  isActive: boolean;
  currentRole: TenantRole | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pickedRole, setPickedRole] = useState<TenantRole | undefined>(
    currentRole,
  );
  const [customPassword, setCustomPassword] = useState("");
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [inheritors, setInheritors] = useState<InheritorOption[] | null>(null);
  const [loadingInheritors, setLoadingInheritors] = useState(false);
  const [inheritorId, setInheritorId] = useState<number | "">("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open || isSelf || inheritors !== null) return;
    setLoadingInheritors(true);
    listInheritorCandidatesAction(userId)
      .then((list) => setInheritors(list))
      .finally(() => setLoadingInheritors(false));
  }, [open, isSelf, inheritors, userId]);

  function copyPassword(pw: string) {
    navigator.clipboard
      .writeText(pw)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy"));
  }

  function generateRandom() {
    startTransition(async () => {
      const res = await resetPasswordAction(userId);
      if (res.ok) {
        setIssuedPassword(res.password);
        toast.success("New temporary password generated");
      } else {
        toast.error(res.error ?? "Could not reset password");
      }
    });
  }

  function setCustom() {
    if (customPassword.trim().length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    startTransition(async () => {
      const res = await resetPasswordAction(userId, customPassword.trim());
      if (res.ok) {
        setIssuedPassword(res.password);
        setCustomPassword("");
        toast.success("Password updated");
      } else {
        toast.error(res.error ?? "Could not set password");
      }
    });
  }

  function saveRole() {
    if (!pickedRole || pickedRole === currentRole) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await changeRoleAction(userId, pickedRole);
      if (res.ok) {
        toast.success(`Role changed to ${ROLE_LABELS[pickedRole]}`);
        setOpen(false);
      } else {
        toast.error(res.error ?? "Could not change role");
      }
    });
  }

  function deleteUser() {
    if (!inheritorId) {
      toast.error("Pick a user to inherit their records first");
      return;
    }
    startTransition(async () => {
      const res = await deleteUserAction(userId, inheritorId as number);
      if (res.ok) {
        toast.success("User deleted");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Could not delete user");
      }
    });
  }

  function toggleActive() {
    startTransition(async () => {
      const res = await toggleActiveAction(userId, !isActive);
      if (res.ok) {
        toast.success(isActive ? "User deactivated" : "User reactivated");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Could not update user status");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="User actions"
      >
        <MoreHorizontal className="size-4" />
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Manage user</SheetTitle>
          <SheetDescription>
            Change the role or deactivate access. Changes take effect
            immediately.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 pt-2">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Role
            </div>
            {isSelf && (
              <p className="text-[11px] text-muted-foreground">
                You can&rsquo;t change your own role. Ask another admin.
              </p>
            )}
            <div className="grid grid-cols-1 gap-2">
              {TENANT_ROLES.filter((r) => r !== "customer").map((r) => {
                const active = pickedRole === r;
                const isCurrent = currentRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPickedRole(r)}
                    disabled={isPending || isSelf}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                      (isPending || isSelf) && "opacity-60",
                    )}
                  >
                    <span className="font-medium">{ROLE_LABELS[r]}</span>
                    {isCurrent && (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="size-4 text-muted-foreground" />
              Password
            </div>
            <p className="text-xs text-muted-foreground">
              Resets revoke all active sessions and clear 2FA — share the new
              password via a secure channel.
            </p>

            {issuedPassword && (
              <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  New temporary password
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-white px-2 py-1.5 font-mono text-xs dark:bg-zinc-900">
                    {issuedPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyPassword(issuedPassword)}
                    aria-label="Copy"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  We won&rsquo;t show this again — copy it now.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={generateRandom}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Generate random password
              </Button>

              <details className="rounded-lg border bg-card">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Or set a custom password…
                </summary>
                <div className="space-y-2 px-3 pb-3">
                  <Label htmlFor="custom-pw">New password (min 8)</Label>
                  <div className="relative">
                    <Input
                      id="custom-pw"
                      type={showCustomPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="pr-10 font-mono"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomPassword((s) => !s)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={showCustomPassword ? "Hide" : "Show"}
                    >
                      {showCustomPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    onClick={setCustom}
                    disabled={isPending || customPassword.length < 8}
                    className="w-full"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Set password"
                    )}
                  </Button>
                </div>
              </details>
            </div>
            {userName && (
              <p className="text-[11px] text-muted-foreground">
                Resetting for <span className="font-medium">{userName}</span>.
              </p>
            )}
          </section>

          <section className="space-y-2 border-t pt-4">
            <div className="text-sm font-semibold">Account status</div>
            <p className="text-xs text-muted-foreground">
              {isActive
                ? "User can sign in and access their assigned features."
                : "User is blocked from signing in."}
            </p>
            <Button
              type="button"
              variant={isActive ? "outline" : "default"}
              className={cn(
                "mt-1",
                isActive &&
                  "border-destructive/40 text-destructive hover:bg-destructive/10",
              )}
              onClick={toggleActive}
              disabled={isSelf || isPending}
            >
              {isActive ? (
                <>
                  <UserMinus className="size-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Reactivate
                </>
              )}
            </Button>
            {isSelf && (
              <p className="text-[11px] text-muted-foreground">
                You can&rsquo;t deactivate yourself.
              </p>
            )}
          </section>

          {!isSelf && (
            <section className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <Trash2 className="size-4" />
                Delete permanently
              </div>
              <p className="text-xs text-muted-foreground">
                Removes the user and reassigns their payments, customers,
                tickets, and collector records to the inheritor below. Audit
                history is preserved with their name. This cannot be undone.
              </p>

              <Label htmlFor="inheritor" className="text-xs">
                Inherit records to
              </Label>
              <select
                id="inheritor"
                value={inheritorId}
                onChange={(e) =>
                  setInheritorId(e.target.value ? Number(e.target.value) : "")
                }
                disabled={isPending || loadingInheritors}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">
                  {loadingInheritors ? "Loading…" : "Pick a user…"}
                </option>
                {(inheritors ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.email}
                    {u.role ? ` (${u.role})` : ""}
                  </option>
                ))}
              </select>

              {!confirmDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending || !inheritorId}
                >
                  <Trash2 className="size-4" />
                  Delete user…
                </Button>
              ) : (
                <div className="mt-2 space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive">
                    This permanently deletes {userName ?? "the user"}. Continue?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(false)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={deleteUser}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        "Yes, delete"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button
            type="button"
            onClick={saveRole}
            disabled={
              isPending || isSelf || !pickedRole || pickedRole === currentRole
            }
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
