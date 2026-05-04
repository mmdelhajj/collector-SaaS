import { Smartphone, ShieldAlert, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(dashboard)/actions";
import type { TenantRole } from "@/lib/users-types";
import { ROLE_LABELS } from "@/lib/users-types";

const ROLE_GUIDANCE: Partial<Record<TenantRole, { title: string; body: string }>> = {
  collector: {
    title: "Collectors use the mobile app",
    body: "Your role is set up for door-to-door collection on the field. Install the ISP Collector app on your phone and sign in there with the same credentials.",
  },
  customer: {
    title: "This portal is for staff",
    body: "Customer self-service is on the way. For now, please contact your provider directly for invoices and support.",
  },
};

export function NoAdminAccess({
  role,
  userName,
}: {
  role: TenantRole | null;
  userName: string;
}) {
  const guidance =
    role && ROLE_GUIDANCE[role]
      ? ROLE_GUIDANCE[role]!
      : {
          title: "No admin access",
          body: "Your account doesn't have permission to use the admin web app. Ask your workspace owner to grant you a staff role if you need access.",
        };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400">
            <ShieldAlert className="size-6" />
          </span>
        </div>

        <h1 className="mt-5 text-center text-xl font-semibold tracking-tight">
          {guidance.title}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {guidance.body}
        </p>

        <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Signed in as
          </p>
          <p className="mt-0.5 font-medium">{userName}</p>
          {role && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Role: <span className="font-medium">{ROLE_LABELS[role]}</span>
            </p>
          )}
        </div>

        {role === "collector" && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Smartphone className="size-4 text-primary" />
              Get the mobile app
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask your manager for the install link, or use the build command
              from the README in <code>mobile-collector/</code>.
            </p>
          </div>
        )}

        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
