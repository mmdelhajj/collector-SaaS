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
  /** Translation key in messages JSON, e.g. "nav.customers". */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  /** Roles that can SEE this item. If omitted, every admin role can see it. */
  roles?: TenantRole[];
};

export type NavSection = {
  /** Optional section header — also a translation key. */
  titleKey?: string;
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
        labelKey: "nav.dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_ADMIN,
      },
      {
        labelKey: "nav.myRoute",
        href: "/my-route",
        icon: Route,
        roles: ["collector"],
      },
    ],
  },
  {
    titleKey: "nav.dailyWork",
    items: [
      {
        labelKey: "nav.customers",
        href: "/customers",
        icon: Users,
        roles: ALL_ADMIN,
      },
      {
        // Collectors + live map are one screen now (Map/List toggle inside),
        // so there is a single sidebar entry instead of two.
        labelKey: "nav.collectors",
        href: "/collectors",
        icon: MapPin,
        roles: PRIVILEGED,
      },
      {
        labelKey: "nav.tickets",
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
      {
        labelKey: "nav.messages",
        href: "/messages",
        icon: MessageSquare,
        roles: ["tenant_owner", "tenant_admin", "manager", "support"],
      },
    ],
  },
  {
    titleKey: "nav.money",
    items: [
      {
        labelKey: "nav.invoices",
        href: "/invoices",
        icon: FileText,
        roles: FINANCE,
      },
      {
        labelKey: "nav.payments",
        href: "/payments",
        icon: Wallet,
        roles: FINANCE,
      },
      {
        labelKey: "nav.cashHandovers",
        href: "/cash-handovers",
        icon: Banknote,
        roles: FINANCE,
      },
      {
        labelKey: "nav.reports",
        href: "/reports",
        icon: BarChart3,
        roles: FINANCE,
      },
    ],
  },
  {
    titleKey: "nav.setup",
    items: [
      {
        labelKey: "nav.packages",
        href: "/packages",
        icon: Package,
        roles: PRIVILEGED,
      },
      {
        labelKey: "nav.radius",
        href: "/radius",
        icon: Radio,
        roles: ["tenant_owner", "tenant_admin", "manager"],
      },
      {
        labelKey: "nav.settings",
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
