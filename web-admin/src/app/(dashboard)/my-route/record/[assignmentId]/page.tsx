import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listMyAssignments } from "@/lib/collector-self";
import { ServiceCategoryBadge } from "@/components/service-category-badge";
import { RecordPaymentForm } from "./record-payment-form";

export const metadata: Metadata = { title: "Record payment" };

export default async function RecordPaymentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  await requireRole([
    "collector",
    "tenant_owner",
    "tenant_admin",
    "manager",
  ]);

  const { assignmentId } = await params;
  const assignments = await listMyAssignments();
  const a = assignments.find((x) => String(x.id) === String(assignmentId));
  if (!a || !a.invoice || !a.invoice.customer) notFound();

  const cust = a.invoice.customer;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/my-route"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to route
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Banknote className="size-6 text-primary" />
          Record payment
        </h1>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold">{cust.full_name}</p>
        <p className="text-xs text-muted-foreground">{cust.code}</p>
        {cust.address_line && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {cust.city ? `${cust.city} · ` : ""}
            {cust.address_line}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 text-sm">
          <ServiceCategoryBadge name={a.invoice.service_category?.name} />
          <span className="font-mono tabular-nums">
            Balance due:{" "}
            <span className="font-semibold">
              ${(a.invoice.balance_due ?? 0).toFixed(2)}
            </span>
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Invoice <span className="font-mono">{a.invoice.number}</span>
        </p>
      </div>

      <RecordPaymentForm
        assignmentId={a.id}
        invoiceId={a.invoice.id}
        customerId={cust.id}
        balanceDue={a.invoice.balance_due ?? 0}
      />
    </div>
  );
}
