"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, LogOut, Plus, Search, UserCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/(dashboard)/actions";
import { useT } from "@/lib/i18n-provider";

type TopbarProps = {
  user: {
    name: string;
    email: string;
    has_avatar?: boolean;
    avatar_version?: string | null;
  };
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();
  const t = useT();
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("topbar.searchPlaceholder")}
          className="h-9 ps-9 bg-muted/40"
        />
      </div>

      <div className="ms-auto flex items-center gap-2">
        <Link
          href="/invoices"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New invoice</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Notifications"
            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
              <BellOff className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground">
                New activity (overdue invoices, payments received, collector
                handovers) will appear here.
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="User menu"
            className="ms-1 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Avatar className="size-8 border">
              {user.has_avatar && (
                <AvatarImage
                  src={`/api/avatar/me?v=${user.avatar_version ?? "0"}`}
                  alt={user.name}
                />
              )}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserCircle2 className="size-4" />
              {t("topbar.myProfile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              disabled={isPending}
              variant="destructive"
            >
              <LogOut className="size-4" />
              {isPending ? t("common.loading") : t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
