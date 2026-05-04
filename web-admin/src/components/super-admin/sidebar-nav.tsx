"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, Settings, Tag, UserCircle2 } from "lucide-react";
import { useT } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/super-admin", icon: Home, labelKey: "nav.platform" },
  { href: "/super-admin/tenants", icon: Building2, labelKey: "nav.tenants" },
  { href: "/super-admin/plans", icon: Tag, labelKey: "nav.plans" },
  { href: "/super-admin/settings", icon: Settings, labelKey: "nav.settings" },
  {
    href: "/super-admin/profile",
    icon: UserCircle2,
    labelKey: "topbar.myProfile",
  },
] as const;

export function SuperAdminNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="flex-1 px-3 py-4">
      <ul className="space-y-0.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/super-admin" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
