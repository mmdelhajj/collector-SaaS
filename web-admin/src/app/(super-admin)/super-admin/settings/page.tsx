import type { Metadata } from "next";
import { Settings as SettingsIcon } from "lucide-react";
import { getPlatformSettings } from "@/lib/super-admin";
import { SmtpForm } from "./smtp-form";
import { BrandingForm } from "./branding-form";
import { DefaultsForm } from "./defaults-form";

export const metadata: Metadata = { title: "Platform settings · Super-admin" };

export default async function PlatformSettingsPage() {
  const data = await getPlatformSettings();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <SettingsIcon className="size-6 text-primary" />
          Platform settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Global configuration that affects every tenant on this platform.
        </p>
      </div>

      <SmtpForm initial={data.smtp} />
      <BrandingForm initial={data.branding} />
      <DefaultsForm initial={data.defaults} />
    </div>
  );
}
