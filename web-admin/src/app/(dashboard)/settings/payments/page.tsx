import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleDollarSign } from "lucide-react";
import { getPaymentSettings } from "@/lib/settings";
import { PaymentRoutingForm } from "./payment-routing-form";

export const metadata: Metadata = { title: "Payments · Settings" };

export default async function PaymentSettingsPage() {
  const data = await getPaymentSettings();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CircleDollarSign className="size-6 text-primary" />
          Payment routing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For each payment method, tell us if the money <b>passes through the
          collector</b> (they need to hand it over at end of day) or
          <b> goes directly to the company</b> (no handover needed). Card,
          Stripe, and bank transfers should always be set to direct.
        </p>
      </div>

      <PaymentRoutingForm initial={data} />
    </div>
  );
}
