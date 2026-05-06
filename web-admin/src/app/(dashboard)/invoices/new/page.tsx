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

  // Pre-load the first 200 customers for the picker. Search is client-side
  // for simplicity; if a tenant has thousands of customers we'd switch to
  // a debounced server search later.
  const customers = await listCustomers({ perPage: 200 });

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
        customers={customers.data.map((c) => ({
          id: c.id,
          code: c.code,
          full_name: c.full_name,
          city: c.city ?? null,
        }))}
      />
    </div>
  );
}
