import { redirect } from "next/navigation";
import { NoAdminAccess } from "@/components/dashboard/no-admin-access";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import {
  getCurrentTenant,
  getCurrentUser,
  isAdminUser,
  primaryRole,
} from "@/lib/auth";
import { readLocale } from "@/lib/locale-cookie";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, tenant] = await Promise.all([
    getCurrentUser(),
    getCurrentTenant(),
  ]);
  if (!user) redirect("/login");

  // Customers (and any unknown role) get bounced — collectors ARE allowed
  // and see a narrowed sidebar + their /my-route landing page.
  if (!isAdminUser(user)) {
    return <NoAdminAccess role={primaryRole(user)} userName={user.name} />;
  }

  const locale = await readLocale();

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar locale={locale} role={primaryRole(user)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {tenant && <TrialBanner tenant={tenant} />}
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
