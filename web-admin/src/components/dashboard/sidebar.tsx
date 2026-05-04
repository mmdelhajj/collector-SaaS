"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { navigationFor } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import type { TenantRole } from "@/lib/users-types";
import { cn } from "@/lib/utils";

export function Sidebar({
  locale = "en",
  role,
}: {
  locale?: Locale;
  role?: TenantRole | null;
}) {
  const pathname = usePathname();
  const navigation = useMemo(() => navigationFor(role ?? null), [role]);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/dashboard" className="flex items-center">
          <Logo />
        </Link>
      </div>

      <button
        type="button"
        className="mx-3 mt-3 flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent"
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            Workspace
          </p>
          <p className="truncate text-sm font-semibold">Demo ISP</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((section, idx) => (
          <div key={idx} className="mb-6 last:mb-0">
            {section.title && (
              <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
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
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ms-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t p-3">
        <LocaleSwitcher current={locale} />
        <div className="rounded-lg bg-sidebar-accent/40 p-3">
          <p className="text-xs font-medium">Trial · 12 days left</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upgrade to Growth for unlimited collectors and SMS receipts.
          </p>
          <Link
            href="/settings"
            className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
            prefetch={false}
          >
            Upgrade plan →
          </Link>
        </div>
      </div>
    </aside>
  );
}
