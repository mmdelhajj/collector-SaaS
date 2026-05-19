"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarBody } from "@/components/dashboard/sidebar";
import type { Locale } from "@/lib/i18n";
import type { TenantRole } from "@/lib/users-types";

/**
 * Hamburger-triggered sidebar drawer for screens below `lg`. Pairs with
 * the desktop `<Sidebar>` — that one renders the nav as a fixed aside on
 * wide screens, this one slides it in from the left on phones/tablets.
 */
export function MobileSidebar({
  locale,
  role,
  tenant,
}: {
  locale?: Locale;
  role?: TenantRole | null;
  tenant?: {
    name?: string;
    status?: string | null;
    plan?: string | null;
    trial_ends_at?: string | null;
  } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex size-10 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-accent lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-72 flex-col bg-sidebar p-0 text-sidebar-foreground"
      >
        <SidebarBody
          locale={locale}
          role={role}
          tenant={tenant}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
