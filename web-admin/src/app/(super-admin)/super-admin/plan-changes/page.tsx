import type { Metadata } from "next";
import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { listPlanChangeRequests } from "@/lib/super-admin";
import { LocalDateTime } from "@/components/ui/local-datetime";
import { DecideButtons } from "./decide-buttons";

export const metadata: Metadata = { title: "Plan changes · Super-admin" };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  cancelled: "bg-zinc-100 text-zinc-700 ring-zinc-600/20",
};

const FORMAT_MONEY = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export default async function PlanChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "pending") as
    | "pending"
    | "approved"
    | "rejected"
    | "cancelled"
    | "all";
  const { requests, pendingCount } = await listPlanChangeRequests(status);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ClipboardList className="size-6 text-primary" />
            Plan change requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tenants submit plan upgrades from <code>/settings/billing</code>.
            Approve or reject; the change is applied only on approval.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex gap-1 border-b">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => {
          const isActive = status === s;
          return (
            <a
              key={s}
              href={`/super-admin/plan-changes?status=${s}`}
              className={
                "border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors " +
                (isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {s}
            </a>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          {status === "pending" ? (
            <>
              <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
              <p className="font-medium text-foreground">All caught up.</p>
              <p className="mt-1">No pending plan change requests.</p>
            </>
          ) : (
            <p>No requests with status &ldquo;{status}&rdquo;.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {r.tenant?.name ?? "(deleted tenant)"}
                    </h2>
                    <span
                      className={
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset " +
                        (STATUS_STYLES[r.status] ?? "")
                      }
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="capitalize">
                      {r.tenant?.current_plan ?? "—"}
                    </span>
                    /{r.tenant?.current_period ?? "—"}{" "}
                    <span className="mx-1">→</span>
                    <strong className="text-foreground">
                      {r.requested_plan?.name ?? "—"}
                    </strong>
                    /{r.requested_period}{" "}
                    {r.requested_plan && (
                      <span className="text-xs">
                        (
                        {r.requested_period === "annual" &&
                        r.requested_plan.price_annual !== null
                          ? FORMAT_MONEY(r.requested_plan.price_annual) + "/yr"
                          : FORMAT_MONEY(r.requested_plan.price_monthly) +
                            "/mo"}
                        )
                      </span>
                    )}
                  </p>
                </div>
                {r.status === "pending" && r.requested_plan && r.tenant && (
                  <DecideButtons
                    requestId={r.id}
                    tenantName={r.tenant.name}
                    planName={r.requested_plan.name}
                    period={r.requested_period}
                  />
                )}
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Requested by</dt>
                  <dd className="mt-0.5 font-medium">
                    {r.requested_by?.name ?? "—"}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({r.requested_by?.email ?? "—"})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="mt-0.5">
                    <LocalDateTime iso={r.created_at} />
                  </dd>
                </div>
                {r.requester_note && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Tenant note</dt>
                    <dd className="mt-0.5 rounded-md bg-muted/40 p-2 text-sm font-normal italic">
                      &ldquo;{r.requester_note}&rdquo;
                    </dd>
                  </div>
                )}
                {r.status !== "pending" && (
                  <>
                    <div>
                      <dt className="text-muted-foreground">
                        {r.status === "approved" ? "Approved" : "Rejected"} by
                      </dt>
                      <dd className="mt-0.5 font-medium">
                        {r.decided_by ?? "—"}{" "}
                        <span className="font-normal text-muted-foreground">
                          (<LocalDateTime iso={r.decided_at} />)
                        </span>
                      </dd>
                    </div>
                    {r.decision_note && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Decision note</dt>
                        <dd className="mt-0.5 rounded-md bg-muted/40 p-2 text-sm">
                          {r.decision_note}
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
