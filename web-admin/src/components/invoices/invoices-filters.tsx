"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/lib/invoices-types";
import { cn } from "@/lib/utils";

type Filter = InvoiceStatus | "all" | "overdue";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  ...(INVOICE_STATUSES.filter(
    (s) => !["open", "paid", "partial", "overdue"].includes(s),
  ).map((s) => ({
    value: s as Filter,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  })) as { value: Filter; label: string }[]),
];

export function InvoicesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSearch = params.get("search") ?? "";
  const currentStatus = (params.get("status") ?? "all") as Filter;

  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    if (search === currentSearch) return;
    const t = setTimeout(() => push({ search: search || null, page: null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function push(updates: Record<string, string | null>) {
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
          placeholder="Search invoice number or customer name…"
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
        {FILTERS.map((f) => {
          const active = currentStatus === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() =>
                push({
                  status: f.value === "all" ? null : f.value,
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
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
