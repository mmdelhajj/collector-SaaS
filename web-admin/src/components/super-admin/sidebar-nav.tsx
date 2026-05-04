"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, Settings, Tag, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/super-admin", icon: Home, label: "Platform" },
  { href: "/super-admin/tenants", icon: Building2, label: "Tenants" },
  { href: "/super-admin/plans", icon: Tag, label: "Plans" },
  { href: "/super-admin/settings", icon: Settings, label: "Settings" },
  { href: "/super-admin/profile", icon: UserCircle2, label: "My profile" },
] as const;

export function SuperAdminNav() {
  const pathname = usePathname();

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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
