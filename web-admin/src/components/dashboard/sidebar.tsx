"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { navigationFor } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import { useT } from "@/lib/i18n-provider";
import type { TenantRole } from "@/lib/users-types";
import { cn } from "@/lib/utils";

type SidebarTenant = {
  name?: string;
  status?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
};

export function Sidebar({
  locale = "en",
  role,
  tenant,
}: {
  locale?: Locale;
  role?: TenantRole | null;
  tenant?: SidebarTenant | null;
}) {
  const pathname = usePathname();
  const t = useT();
  const navigation = useMemo(() => navigationFor(role ?? null), [role]);

  // Compute days remaining only when actually on trial. Banner hides itself
  // for paid/active tenants so we don't pester them.
  const trialDays =
    tenant?.status === "trial" && tenant.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(tenant.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

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
            {t("settings.workspace")}
          </p>
          <p className="truncate text-sm font-semibold">
            {tenant?.name ?? "—"}
          </p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((section, idx) => (
          <div key={idx} className="mb-6 last:mb-0">
            {section.titleKey && (
              <h3 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(section.titleKey)}
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
                      <span className="truncate">{t(item.labelKey)}</span>
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
        {/*
          Trial banner only shows while the tenant is actually on trial.
          Once they upgrade (status flips to active or anything else), it
          disappears so we don't keep nagging paying customers.
        */}
        {trialDays !== null && (
          <div className="rounded-lg bg-sidebar-accent/40 p-3">
            <p className="text-xs font-medium">
              {t("billing.trial")} ·{" "}
              {t("billing.daysLeft").replace("{n}", String(trialDays))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("billing.trialPrompt")}
            </p>
            <Link
              href="/settings/billing"
              className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
              prefetch={false}
            >
              {t("billing.upgradePlan")} →
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
