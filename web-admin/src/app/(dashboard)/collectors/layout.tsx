import { requireRole } from "@/lib/auth";

export default async function CollectorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["tenant_owner", "tenant_admin", "manager"]);
  return children;
}
