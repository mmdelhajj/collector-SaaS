"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfileAction } from "@/lib/profile-actions";

type Initial = {
  name: string;
  email: string;
  phone: string | null;
  locale: "en" | "ar" | "fr";
  timezone: string;
};

const TIMEZONES = [
  "Asia/Beirut",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Africa/Cairo",
  "Europe/Paris",
  "Europe/London",
  "UTC",
];

export function ProfileForm({ initial }: { initial: Initial }) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [locale, setLocale] = useState(initial.locale);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveProfileAction({
        name,
        phone: phone.trim() === "" ? null : phone,
        locale,
        timezone,
      });
      if (res.ok) toast.success("Profile saved");
      else toast.error(res.error ?? "Save failed");
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <header>
        <h2 className="text-base font-semibold">Personal info</h2>
        <p className="text-xs text-muted-foreground">
          Email is fixed — contact your tenant admin to change it.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={initial.email} readOnly disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+961 70 123 456"
            maxLength={32}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="locale">Language</Label>
          <select
            id="locale"
            value={locale}
            onChange={(e) =>
              setLocale(e.target.value as "en" | "ar" | "fr")
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tz">Timezone</Label>
          <select
            id="tz"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
            {!TIMEZONES.includes(timezone) && (
              <option value={timezone}>{timezone}</option>
            )}
          </select>
        </div>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </section>
  );
}
