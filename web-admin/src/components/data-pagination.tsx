"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type DataPaginationProps = {
  currentPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
  total: number;
  /** Label for the row count, e.g. "customers" or "packages". */
  unit?: string;
};

export function DataPagination({
  currentPage,
  lastPage,
  from,
  to,
  total,
  unit,
}: DataPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function goto(page: number) {
    const next = new URLSearchParams(params.toString());
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {total === 0 ? (
          unit ? (
            `No ${unit}`
          ) : (
            "No results"
          )
        ) : (
          <>
            Showing <span className="font-medium text-foreground">{from}</span>–
            <span className="font-medium text-foreground">{to}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span>
            {unit && <> {unit}</>}
          </>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => goto(currentPage - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          Page {currentPage} of {lastPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= lastPage}
          onClick={() => goto(currentPage + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
