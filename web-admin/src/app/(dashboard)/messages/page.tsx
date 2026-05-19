import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  Mail,
  MessageSquare,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { listMessages, type MessageChannel } from "@/lib/messages";
import { MESSAGE_CHANNELS } from "@/lib/messages-types";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { DataPagination } from "@/components/data-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

type SearchParams = Promise<{ page?: string; channel?: string }>;
const PER_PAGE = 25;

const CHANNEL_ICONS: Record<MessageChannel, LucideIcon> = {
  whatsapp: MessageSquare,
  sms: Smartphone,
  email: Mail,
};

const CHANNEL_STYLES: Record<MessageChannel, string> = {
  whatsapp:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400",
  sms: "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950/40 dark:text-orange-400",
  email:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-400",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const channel =
    sp.channel && (MESSAGE_CHANNELS as readonly string[]).includes(sp.channel)
      ? (sp.channel as MessageChannel)
      : undefined;

  let list: Awaited<ReturnType<typeof listMessages>>;
  try {
    list = await listMessages({ page, perPage: PER_PAGE, channel });
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every receipt, reminder, and notification sent by the system. Right
          now we&rsquo;re running with the&nbsp;
          <span className="font-mono text-foreground">log</span> driver — the
          message body lands in <span className="font-mono">storage/logs</span>{" "}
          instead of going to a real provider.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip href="/messages" label="All" active={!channel} />
        {MESSAGE_CHANNELS.map((c) => (
          <Chip
            key={c}
            href={`/messages?channel=${c}`}
            label={c.charAt(0).toUpperCase() + c.slice(1)}
            active={channel === c}
          />
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <span className="text-sm text-muted-foreground">
                    No messages yet. Record a payment to trigger a receipt send.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              list.data.map((m) => {
                const Icon = CHANNEL_ICONS[m.channel];
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(m.sent_at ?? m.created_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize",
                          CHANNEL_STYLES[m.channel],
                        )}
                      >
                        <Icon className="size-3" />
                        {m.channel}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {m.to_address}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.customer ? (
                        <div>
                          <p className="truncate font-medium">
                            {m.customer.full_name}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {m.customer.code}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.template_key ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.provider ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize",
                          m.status === "sent" ||
                            m.status === "delivered" ||
                            m.status === "read"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : m.status === "queued"
                              ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                              : m.status === "failed"
                                ? "bg-red-50 text-red-700 ring-red-600/20"
                                : "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
                        )}
                      >
                        {m.status}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <DataPagination
          currentPage={list.meta.current_page}
          lastPage={list.meta.last_page}
          from={list.meta.from}
          to={list.meta.to}
          total={list.meta.total}
          unit="messages"
        />
      </div>
    </div>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
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
              Sign in as a tenant admin (e.g.{" "}
              <span className="font-mono text-foreground">{email}</span> needs a
              tenant) to view messages.
            </p>
            <div className="mt-6">
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in as a tenant admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
