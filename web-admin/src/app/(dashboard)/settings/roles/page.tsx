import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { listRoles } from "@/lib/roles";
import { RolesEditor } from "./roles-editor";

export const metadata: Metadata = { title: "Roles · Settings" };

const PERMISSION_GROUPS: Array<{
  label: string;
  permissions: Array<{ key: string; label: string }>;
}> = [
  {
    label: "Customers",
    permissions: [
      { key: "customers.view", label: "View customers" },
      { key: "customers.create", label: "Create customers" },
      { key: "customers.edit", label: "Edit customers" },
      { key: "customers.delete", label: "Delete customers" },
    ],
  },
  {
    label: "Packages",
    permissions: [
      { key: "packages.view", label: "View packages" },
      { key: "packages.manage", label: "Manage packages" },
    ],
  },
  {
    label: "Invoices",
    permissions: [
      { key: "invoices.view", label: "View invoices" },
      { key: "invoices.create", label: "Create invoices" },
      { key: "invoices.edit", label: "Edit invoices" },
      { key: "invoices.cancel", label: "Cancel invoices" },
      { key: "invoices.discount", label: "Apply discounts" },
    ],
  },
  {
    label: "Payments",
    permissions: [
      { key: "payments.view", label: "View payments" },
      { key: "payments.record", label: "Record payments" },
      { key: "payments.refund", label: "Refund payments" },
    ],
  },
  {
    label: "Collectors",
    permissions: [
      { key: "collectors.view", label: "View assignments" },
      { key: "collectors.assign", label: "Assign collectors" },
      { key: "collectors.reassign", label: "Reassign collectors" },
    ],
  },
  {
    label: "Reports",
    permissions: [
      { key: "reports.view", label: "View reports" },
      { key: "reports.export", label: "Export CSV" },
    ],
  },
  {
    label: "Administration",
    permissions: [
      { key: "users.manage", label: "Manage users" },
      { key: "roles.manage", label: "Manage roles" },
      { key: "radius.manage", label: "Manage RADIUS" },
      { key: "nas.manage", label: "Manage NAS" },
      { key: "settings.manage", label: "Manage workspace" },
      { key: "billing.manage", label: "Manage billing" },
    ],
  },
];

export default async function RolesPage() {
  const data = await listRoles();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="size-6 text-primary" />
          Roles &amp; permissions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tick / untick to grant or revoke a permission per role. Changes take
          effect immediately. <span className="font-medium">Owner</span> and{" "}
          <span className="font-medium">Customer</span> rows are locked.
        </p>
      </div>

      <RolesEditor initial={data} groups={PERMISSION_GROUPS} />
    </div>
  );
}
