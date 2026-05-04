"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBrandingAction } from "./actions";

type BrandingInitial = {
  platform_name: string;
  support_email: string;
  logo_url: string;
  tagline: string;
};

export function BrandingForm({ initial }: { initial: BrandingInitial }) {
  const [name, setName] = useState(initial.platform_name);
  const [supportEmail, setSupportEmail] = useState(initial.support_email);
  const [logoUrl, setLogoUrl] = useState(initial.logo_url);
  const [tagline, setTagline] = useState(initial.tagline);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveBrandingAction({
        platform_name: name,
        support_email: supportEmail || undefined,
        logo_url: logoUrl || undefined,
        tagline: tagline || undefined,
      });
      if (res.ok) toast.success("Branding saved");
      else toast.error(res.error ?? "Save failed");
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <header className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Platform branding</h2>
          <p className="text-xs text-muted-foreground">
            Public-facing name + logo for the marketing site, signup emails, and
            the login page.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Platform name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Support email</Label>
          <Input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@your-domain.com"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Logo URL</Label>
          <Input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://your-domain.com/logo.png"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Tagline</Label>
          <Input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Built for ISPs in MENA"
          />
        </div>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Save branding"
          )}
        </Button>
      </div>
    </section>
  );
}
