"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Lock, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/users-types";
import type { RoleEntry, RolesPayload } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { saveRolePermissionsAction } from "./actions";

type PermissionGroup = {
  label: string;
  permissions: Array<{ key: string; label: string }>;
};

export function RolesEditor({
  initial,
  groups,
}: {
  initial: RolesPayload;
  groups: PermissionGroup[];
}) {
  // Working set of role → permissions, mutated locally before save.
  const [draft, setDraft] = useState<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    for (const r of initial.roles) out[r.name] = new Set(r.permissions);
    return out;
  });
  const [original, setOriginal] = useState<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    for (const r of initial.roles) out[r.name] = new Set(r.permissions);
    return out;
  });
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirtyRoles = useMemo(() => {
    return initial.roles.filter((r) => {
      if (!r.editable) return false;
      const a = draft[r.name];
      const b = original[r.name];
      if (a.size !== b.size) return true;
      for (const p of a) if (!b.has(p)) return true;
      return false;
    });
  }, [draft, original, initial.roles]);

  function toggle(roleName: string, perm: string) {
    setDraft((prev) => {
      const next = { ...prev };
      const set = new Set(next[roleName]);
      if (set.has(perm)) set.delete(perm);
      else set.add(perm);
      next[roleName] = set;
      return next;
    });
  }

  function toggleAllInGroup(roleName: string, groupKeys: string[]) {
    setDraft((prev) => {
      const next = { ...prev };
      const set = new Set(next[roleName]);
      const allOn = groupKeys.every((k) => set.has(k));
      if (allOn) {
        for (const k of groupKeys) set.delete(k);
      } else {
        for (const k of groupKeys) set.add(k);
      }
      next[roleName] = set;
      return next;
    });
  }

  function saveRole(role: RoleEntry) {
    setSavingRole(role.name);
    startTransition(async () => {
      const perms = Array.from(draft[role.name] ?? []);
      const res = await saveRolePermissionsAction(role.name, perms);
      if (res.ok) {
        setOriginal((prev) => ({
          ...prev,
          [role.name]: new Set(perms),
        }));
        toast.success(`${ROLE_LABELS[role.name as keyof typeof ROLE_LABELS] ?? role.name} saved`);
      } else {
        toast.error(res.error ?? "Could not save");
      }
      setSavingRole(null);
    });
  }

  function revertRole(roleName: string) {
    setDraft((prev) => ({
      ...prev,
      [roleName]: new Set(original[roleName]),
    }));
  }

  return (
    <div className="space-y-3">
      {dirtyRoles.length > 0 && (
        <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-y bg-amber-50/80 px-4 py-2 text-sm shadow-sm backdrop-blur lg:-mx-8 lg:px-8 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
            <span className="font-semibold">{dirtyRoles.length}</span>
            unsaved {dirtyRoles.length === 1 ? "role change" : "role changes"}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-400">
            Click <span className="font-semibold">Save</span> on each role
            below to apply.
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-10 min-w-[260px] bg-muted/30 px-4 py-3 text-left">
                Permission
              </th>
              {initial.roles.map((r) => {
                const dirty = dirtyRoles.some((d) => d.name === r.name);
                return (
                  <th
                    key={r.name}
                    className={cn(
                      "min-w-[120px] px-3 py-3 text-center font-medium",
                      dirty && "bg-amber-50 dark:bg-amber-950/30",
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-foreground flex items-center gap-1">
                        {ROLE_LABELS[r.name as keyof typeof ROLE_LABELS] ??
                          r.name}
                        {!r.editable && (
                          <Lock
                            className="size-3 text-muted-foreground"
                            aria-label="Locked"
                          />
                        )}
                        {dirty && (
                          <span
                            className="size-1.5 rounded-full bg-amber-500"
                            aria-label="Unsaved changes"
                          />
                        )}
                      </span>
                      <span className="font-mono text-[10px] font-normal opacity-60">
                        {r.name}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {groups.map((group) => {
              const groupKeys = group.permissions.map((p) => p.key);
              return (
                <Fragment key={group.label}>
                  <tr>
                    <td
                      colSpan={initial.roles.length + 1}
                      className="bg-muted/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      <div className="flex items-center justify-between">
                        <span>{group.label}</span>
                        <div className="flex items-center gap-1">
                          {initial.roles
                            .filter((r) => r.editable)
                            .map((r) => {
                              const set = draft[r.name] ?? new Set();
                              const allOn = groupKeys.every((k) => set.has(k));
                              return (
                                <button
                                  key={r.name}
                                  type="button"
                                  onClick={() =>
                                    toggleAllInGroup(r.name, groupKeys)
                                  }
                                  className="rounded border bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground hover:bg-muted hover:text-foreground"
                                  title={`${allOn ? "Clear" : "Set"} all in ${group.label} for ${r.name}`}
                                >
                                  {allOn ? "−" : "+"} {r.name.slice(0, 4)}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {group.permissions.map((p) => (
                    <tr key={p.key} className="hover:bg-muted/20">
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium">
                        <div>{p.label}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {p.key}
                        </div>
                      </td>
                      {initial.roles.map((r) => {
                        const set = draft[r.name] ?? new Set();
                        const has = set.has(p.key);
                        const dirty =
                          original[r.name]?.has(p.key) !== has;
                        return (
                          <td
                            key={r.name}
                            className={cn(
                              "px-3 py-2 text-center",
                              dirty && "bg-amber-50/50 dark:bg-amber-950/20",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={has}
                              disabled={!r.editable}
                              onChange={() => toggle(r.name, p.key)}
                              className={cn(
                                "size-4 rounded border-input",
                                !r.editable && "cursor-not-allowed opacity-50",
                              )}
                              aria-label={`${p.label} for ${r.name}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}

            {/* Per-role save buttons row */}
            <tr className="bg-muted/10">
              <td className="sticky left-0 z-10 bg-muted/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </td>
              {initial.roles.map((r) => {
                const dirty = dirtyRoles.some((d) => d.name === r.name);
                return (
                  <td key={r.name} className="px-2 py-2 text-center">
                    {!r.editable ? (
                      <span className="text-[10px] text-muted-foreground">
                        Locked
                      </span>
                    ) : dirty ? (
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveRole(r)}
                          disabled={isPending}
                          className="h-7 text-xs"
                        >
                          {savingRole === r.name ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Save className="size-3" />
                          )}
                          Save
                        </Button>
                        <button
                          type="button"
                          onClick={() => revertRole(r.name)}
                          disabled={isPending}
                          className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <Undo2 className="size-2.5" />
                          revert
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-500">
                        <CheckCircle2 className="size-3" />
                        synced
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
