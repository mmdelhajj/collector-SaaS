import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Wallet,
  Banknote,
  MapPin,
  Radio,
  MessageSquare,
  Route,
  Wrench,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { TenantRole } from "@/lib/users-types";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  /** Roles that can SEE this item. If omitted, every admin role can see it. */
  roles?: TenantRole[];
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

const ALL_ADMIN: TenantRole[] = [
  "tenant_owner",
  "tenant_admin",
  "manager",
  "accountant",
  "support",
  "technician",
];
const PRIVILEGED: TenantRole[] = ["tenant_owner", "tenant_admin", "manager"];
const FINANCE: TenantRole[] = [
  "tenant_owner",
  "tenant_admin",
  "manager",
  "accountant",
];

export const navigation: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_ADMIN,
      },
      {
        label: "My route",
        href: "/my-route",
        icon: Route,
        roles: ["collector", "tenant_owner", "tenant_admin", "manager"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Customers", href: "/customers", icon: Users, roles: ALL_ADMIN },
      {
        label: "Packages",
        href: "/packages",
        icon: Package,
        roles: PRIVILEGED,
      },
      { label: "Invoices", href: "/invoices", icon: FileText, roles: FINANCE },
      { label: "Payments", href: "/payments", icon: Wallet, roles: FINANCE },
      {
        label: "Collectors",
        href: "/collectors",
        icon: MapPin,
        roles: PRIVILEGED,
      },
      {
        label: "Cash handovers",
        href: "/cash-handovers",
        icon: Banknote,
        roles: FINANCE,
      },
      {
        label: "Tickets",
        href: "/tickets",
        icon: Wrench,
        roles: [
          "tenant_owner",
          "tenant_admin",
          "manager",
          "support",
          "technician",
        ],
      },
    ],
  },
  {
    title: "Network",
    items: [
      {
        label: "RADIUS",
        href: "/radius",
        icon: Radio,
        roles: ["tenant_owner", "tenant_admin", "manager"],
      },
      {
        label: "Messages",
        href: "/messages",
        icon: MessageSquare,
        roles: ["tenant_owner", "tenant_admin", "manager", "support"],
      },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, roles: FINANCE },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["tenant_owner", "tenant_admin"],
      },
    ],
  },
];

/**
 * Drop sections + items the user can't see.
 */
export function navigationFor(role: TenantRole | null): NavSection[] {
  if (!role) return [];
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || item.roles.includes(role),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
