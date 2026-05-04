import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getIntegrations } from "@/lib/settings";
import { IntegrationsForm } from "./integrations-form";

export const metadata: Metadata = { title: "Integrations · Settings" };

export default async function IntegrationsSettingsPage() {
  const data = await getIntegrations();

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
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          WhatsApp, SMS, and RADIUS gateway credentials. Secrets are write-only
          — we never display them back.
        </p>
      </div>

      <IntegrationsForm initial={data} />
    </div>
  );
}
