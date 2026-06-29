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

  // Apply the tenant's saved brand colour to the theme. The workspace form
  // stores a 6-digit hex; we override the primary CSS variables (light + dark)
  // so bg-primary / text-primary / the sidebar all pick it up. Validated
  // against a strict hex pattern so a bad value can't inject CSS.
  const brand =
    tenant?.primary_color && /^#[0-9a-fA-F]{6}$/.test(tenant.primary_color)
      ? tenant.primary_color
      : null;

  return (
    <I18nProvider locale={locale} messages={messages}>
      {brand && (
        <style
          dangerouslySetInnerHTML={{
            __html: `:root,.dark{--primary:${brand};--sidebar-primary:${brand};--ring:${brand};}`,
          }}
        />
      )}
      <div className="flex min-h-screen flex-1">
        <Sidebar locale={locale} role={primaryRole(user)} tenant={tenant} />
        <div className="flex min-w-0 flex-1 flex-col">
          {tenant && <TrialBanner tenant={tenant} />}
          <Topbar
            user={user}
            locale={locale}
            role={primaryRole(user)}
            tenant={tenant}
          />
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </I18nProvider>
  );
}
