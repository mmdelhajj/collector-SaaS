"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/customers-types";
import { cn } from "@/lib/utils";

type StatusFilter = CustomerStatus | "all";
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...CUSTOMER_STATUSES.map((s) => ({
    value: s as StatusFilter,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  })),
];

export function CustomerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSearch = params.get("search") ?? "";
  const currentStatus = (params.get("status") ?? "all") as StatusFilter;

  const [search, setSearch] = useState(currentSearch);

  // Debounce search input → URL.
  useEffect(() => {
    if (search === currentSearch) return;
    const handle = setTimeout(() => {
      pushParams({ search: search || null, page: null });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code, phone, email…"
          className="h-9 ps-9 pe-9 bg-muted/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const active = currentStatus === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                pushParams({
                  status: opt.value === "all" ? null : opt.value,
                  page: null,
                })
              }
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
