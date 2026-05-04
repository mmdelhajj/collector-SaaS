import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(dashboard)/actions";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { SuperAdminNav } from "@/components/super-admin/sidebar-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Backend already gates /api/v1/super-admin/* — but we want to show the
  // friendly NoAccess page if a tenant user types /super-admin/... directly.
  // Super-admins have NO roles (their Spatie roles are scoped per tenant),
  // so we use the explicit lack of any tenant role to detect them. The /me
  // endpoint already includes tenant: null for super-admins.
  const { getCurrentTenant } = await import("@/lib/auth");
  const tenant = await getCurrentTenant();
  if (tenant !== null) {
    // They belong to a tenant — not a super-admin. Bounce to the right place.
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-1">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <Logo />
        </div>

        <div className="flex items-center gap-2 px-3 pt-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
            <Crown className="size-3" />
            Super-admin
          </span>
        </div>

        <SuperAdminNav />

        <div className="border-t p-3">
          <Link
            href="/super-admin/profile"
            className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-sidebar-accent/60"
          >
            <Avatar className="size-9 border">
              {user.has_avatar && (
                <AvatarImage
                  src={`/api/avatar/me?v=${user.avatar_version ?? "0"}`}
                  alt={user.name}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user.email}
              </p>
            </div>
          </Link>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
