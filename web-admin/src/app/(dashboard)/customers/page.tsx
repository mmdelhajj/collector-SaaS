import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Mail, Phone } from "lucide-react";
import { listCustomers, type CustomerStatus } from "@/lib/customers";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { StatusBadge } from "@/components/customers/status-badge";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { DataPagination } from "@/components/data-pagination";
import { NewCustomerSheet } from "@/components/customers/new-customer-sheet";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Customers" };

type SearchParams = Promise<{
  page?: string;
  search?: string;
  status?: string;
}>;

const PER_PAGE = 25;
const VALID_STATUSES: readonly string[] = [
  "active",
  "suspended",
  "terminated",
  "dormant",
  "prospect",
];

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const search = sp.search?.trim() || undefined;
  const status =
    sp.status && VALID_STATUSES.includes(sp.status)
      ? (sp.status as CustomerStatus)
      : undefined;

  let list: Awaited<ReturnType<typeof listCustomers>>;
  try {
    list = await listCustomers({ page, perPage: PER_PAGE, search, status });
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
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All subscribers across your services. Use the row menu to edit or
            delete.
          </p>
        </div>
        <NewCustomerSheet />
      </div>

      <CustomerFilters />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="hidden xl:table-cell text-right">
                Since
              </TableHead>
              <TableHead className="w-[60px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      No customers match your filters.
                    </span>
                    <span>
                      Try clearing the search or status, or add a new customer.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link
                      href={`/customers/${c.id}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {c.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/customers/${c.id}`}
                      className="flex items-center gap-2.5 hover:opacity-80"
                    >
                      <Avatar className="size-8 border">
                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                          {initials(c.first_name, c.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {c.full_name}
                        </p>
                        {c.email && (
                          <p className="truncate text-xs text-muted-foreground md:hidden">
                            {c.email}
                          </p>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="inline-flex items-center gap-1 text-foreground/90">
                        <Phone className="size-3 text-muted-foreground" />
                        {c.phone_primary}
                      </span>
                      {c.email && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Mail className="size-3" />
                          <span className="truncate">{c.email}</span>
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {c.city ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        c.balance_due > 0
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {formatMoney(c.balance_due)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-right text-xs text-muted-foreground">
                    {formatDate(c.service_started_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <CustomerRowActions customer={c} />
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
          unit="customers"
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
              platform-level super-admin with no default tenant. Tenant-scoped
              pages need a workspace to operate on.
            </p>

            <div className="mt-6 space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">Two ways to fix this:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="font-medium text-foreground">
                      Sign in as a tenant admin.
                    </span>{" "}
                    Use{" "}
                    <code className="rounded bg-background px-1 py-0.5 font-mono text-xs text-foreground">
                      admin@demoisp.com
                    </code>{" "}
                    or{" "}
                    <code className="rounded bg-background px-1 py-0.5 font-mono text-xs text-foreground">
                      admin@demoelectric.com
                    </code>{" "}
                    (password{" "}
                    <code className="rounded bg-background px-1 py-0.5 font-mono text-xs text-foreground">
                      password
                    </code>
                    ).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    <span className="font-medium text-foreground">
                      Wait for the tenant switcher.
                    </span>{" "}
                    A workspace selector for super-admins is on the roadmap — it
                    sets <code className="font-mono text-xs">X-Tenant-ID</code>{" "}
                    on every API call.
                  </span>
                </li>
              </ul>
            </div>

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
