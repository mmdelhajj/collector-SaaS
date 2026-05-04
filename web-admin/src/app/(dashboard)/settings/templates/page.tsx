import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listTemplates } from "@/lib/templates";
import { TEMPLATE_KEYS } from "@/lib/templates-types";
import { TemplatesList } from "./templates-list";

export const metadata: Metadata = { title: "Templates · Settings" };

export default async function TemplatesPage() {
  const templates = await listTemplates();

  // Group by template key.
  const grouped = TEMPLATE_KEYS.map(({ key, label }) => ({
    key,
    label,
    rows: templates.filter((t) => t.key === key),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Message templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          WhatsApp, SMS, and email content per locale. Use{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
            {"{{variables}}"}
          </code>{" "}
          like <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{"{{customer_name}}"}</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{"{{amount}}"}</code>.
        </p>
      </div>

      <TemplatesList groups={grouped} />
    </div>
  );
}
