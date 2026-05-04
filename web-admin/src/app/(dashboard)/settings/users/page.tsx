import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { listUsers, type TenantRole } from "@/lib/users";
import { ROLE_LABELS, TENANT_ROLES } from "@/lib/users-types";
import { ApiError } from "@/lib/api";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { RoleBadge } from "@/components/users/role-badge";
import { InviteUserSheet } from "@/components/users/invite-user-sheet";
import { UserRowActions } from "@/components/users/user-row-actions";
import { DataPagination } from "@/components/data-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

type SearchParams = Promise<{
  page?: string;
  role?: string;
}>;

const PER_PAGE = 25;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Only owners + admins can manage users.
  await requireRole(["tenant_owner", "tenant_admin"]);

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const role =
    sp.role && (TENANT_ROLES as readonly string[]).includes(sp.role)
      ? (sp.role as TenantRole)
      : undefined;

  const me = await getCurrentUser();

  let list: Awaited<ReturnType<typeof listUsers>>;
  try {
    list = await listUsers({ page, perPage: PER_PAGE, role });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 400) redirect("/login");
    }
    throw err;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3" />
        Back to settings
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Users & roles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite teammates, change their role, and deactivate departed staff.
            Permissions are bound to roles — see the role grid in the spec.
          </p>
        </div>
        <InviteUserSheet />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip href="/settings/users" label="All" active={!role} />
        {TENANT_ROLES.filter((r) => r !== "customer").map((r) => (
          <FilterChip
            key={r}
            href={`/settings/users?role=${r}`}
            label={ROLE_LABELS[r]}
            active={role === r}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden lg:table-cell">
                Last sign-in
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <span className="text-sm text-muted-foreground">
                    No users match this filter.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((u) => {
                const role = u.roles[0] as TenantRole | undefined;
                const isSelf = me?.id === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border">
                          <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">
                              {u.name}
                            </p>
                            {isSelf && (
                              <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                You
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {u.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      {role ? (
                        <RoleBadge role={role} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No role
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(u.last_login_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          u.is_active
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            u.is_active ? "bg-emerald-500" : "bg-zinc-400",
                          )}
                        />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <UserRowActions
                        userId={u.id}
                        userName={u.name}
                        isSelf={isSelf}
                        isActive={u.is_active}
                        currentRole={role}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <DataPagination
          currentPage={list.meta.current_page}
          lastPage={list.meta.last_page}
          from={list.meta.from}
          to={list.meta.to}
          total={list.meta.total}
          unit="users"
        />
      </div>
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
