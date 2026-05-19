import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Gauge, Users } from "lucide-react";
import { listPackages } from "@/lib/packages";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ActiveBadge } from "@/components/packages/active-badge";
import { PackagesFilters } from "@/components/packages/packages-filters";
import { DataPagination } from "@/components/data-pagination";
import { PackageSheet } from "@/components/packages/package-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Packages" };

type SearchParams = Promise<{
  page?: string;
  search?: string;
  active?: string;
}>;

const PER_PAGE = 25;

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const search = sp.search?.trim() || undefined;
  const isActive =
    sp.active === "active"
      ? true
      : sp.active === "inactive"
        ? false
        : undefined;

  let list: Awaited<ReturnType<typeof listPackages>>;
  try {
    list = await listPackages({ page, perPage: PER_PAGE, search, isActive });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 400) {
        const user = await getCurrentUser();
        return <NoTenantContext email={user?.email ?? ""} />;
      }
    }
    throw err;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Service plans your tenant offers — internet, electricity, satellite.
            Each maps to a billing cycle and (for internet) a FreeRADIUS group.
          </p>
        </div>
        <PackageSheet mode={{ kind: "create" }} />
      </div>

      <PackagesFilters />

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Code</TableHead>
              <TableHead className="hidden lg:table-cell">Speed</TableHead>
              <TableHead className="hidden md:table-cell">Billing</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Subscribers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      No packages match your filters.
                    </span>
                    <span>Add one with the button above.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      {p.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                    {p.code}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {p.speed_down_mbps ? (
                      <span className="inline-flex items-center gap-1 text-xs text-foreground/90">
                        <Gauge className="size-3 text-muted-foreground" />
                        {p.speed_down_mbps}
                        {p.speed_up_mbps ? ` / ${p.speed_up_mbps}` : ""} Mbps
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs capitalize text-muted-foreground">
                    {p.billing_period.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatMoney(p.price, p.currency)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-xs tabular-nums text-foreground/80">
                      <Users className="size-3 text-muted-foreground" />
                      {p.subscriptions_count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ActiveBadge isActive={p.is_active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <PackageSheet
                      mode={{ kind: "edit", pkg: p }}
                      triggerVariant="ghost"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <DataPagination
          currentPage={list.meta.current_page}
          lastPage={list.meta.last_page}
          from={list.meta.from}
          to={list.meta.to}
          total={list.meta.total}
          unit="packages"
        />
      </div>
    </div>
  );
}

function NoTenantContext({ email }: { email: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:px-8">
      <div className="rounded-2xl border bg-card p-8 shadow-sm sm:p-10">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertCircle className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              No tenant selected
            </h1>
            <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
              You&rsquo;re signed in as{" "}
              <span className="font-mono text-foreground">{email}</span>, a
              platform-level super-admin with no default tenant. Sign in as a
              tenant admin to view packages.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in as a tenant admin
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
