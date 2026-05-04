import { requireRole } from "@/lib/auth";

/**
 * Hard gate for the entire /settings tree — only owners and admins can
 * reach any page under this segment. Backend permissions still enforce per
 * action, but the UI shouldn't even render to other roles.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["tenant_owner", "tenant_admin"]);
  return children;
}
