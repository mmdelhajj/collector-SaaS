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
import { getMessages } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n-provider";
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
  const messages = getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-1">
        <Sidebar locale={locale} role={primaryRole(user)} />
        <div className="flex min-w-0 flex-1 flex-col">
          {tenant && <TrialBanner tenant={tenant} />}
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </I18nProvider>
  );
}
