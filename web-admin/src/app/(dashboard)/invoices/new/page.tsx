import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/customers";
import { NewInvoiceForm } from "./new-invoice-form";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  // First-paint hint: show the 20 most-recent customers so the picker is
  // useful before the user types. Real searches go through the
  // searchCustomersAction server action with a debounce.
  const recent = await listCustomers({ perPage: 20 });

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to invoices
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">New invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a one-off invoice for a customer. For monthly recurring billing
          across all subscriptions, use{" "}
          <Link
            href="/invoices"
            className="font-medium text-primary hover:underline"
          >
            Generate billing
          </Link>{" "}
          on the invoices list.
        </p>
      </div>

      <NewInvoiceForm
        initialCustomers={recent.data.map((c) => ({
          id: c.id,
          code: c.code,
          full_name: c.full_name,
          city: c.city ?? null,
        }))}
      />
    </div>
  );
}
