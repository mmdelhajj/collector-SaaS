import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic skeleton for the list-page pattern used across the dashboard:
 * page header (title + subtitle + a couple of action buttons), filter row,
 * table with N rows. Renders the same chrome as the real page so the
 * navigation feels instant and content fills in around the user's eye.
 */
export function ListPageSkeleton({
  title,
  rows = 8,
  showFilters = true,
}: {
  title?: string;
  rows?: number;
  showFilters?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          {title ? (
            <h1 className="text-2xl font-semibold tracking-tight text-muted-foreground/40">
              {title}
            </h1>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-9 w-72" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-16 rounded-full" />
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/30 px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3"
              style={{ opacity: Math.max(0.35, 1 - i * 0.08) }}
            >
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
