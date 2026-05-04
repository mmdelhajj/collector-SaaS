"use client";

import { useActionState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Key,
  Loader2,
  MessageSquare,
  Phone,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IntegrationsSettings } from "@/lib/settings-types";
import {
  updateIntegrationsAction,
  type IntegrationsFormState,
} from "./actions";

export function IntegrationsForm({ initial }: { initial: IntegrationsSettings }) {
  const [state, formAction, isPending] = useActionState<
    IntegrationsFormState | undefined,
    FormData
  >(updateIntegrationsAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Integrations saved");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.ok && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>Saved.</span>
        </div>
      )}

      <Section icon={MessageSquare} title="WhatsApp" description="Used for receipts, reminders, and overdue notices.">
        <SelectField
          label="Provider"
          name="whatsapp_provider"
          defaultValue={initial.whatsapp.provider}
          options={[
            { value: "360dialog", label: "360dialog" },
            { value: "twilio", label: "Twilio" },
            { value: "meta", label: "Meta Cloud API" },
          ]}
        />
        <Field
          label="API URL"
          name="whatsapp_api_url"
          type="url"
          placeholder="https://waba.360dialog.io"
          defaultValue={initial.whatsapp.api_url}
        />
        <SecretField
          label="API key"
          name="whatsapp_api_key"
          isSet={initial.whatsapp.api_key_set}
        />
        <Field
          label="From number"
          name="whatsapp_from"
          placeholder="+96170123456"
          defaultValue={initial.whatsapp.from_number}
        />
      </Section>

      <Section icon={Phone} title="SMS" description="Fallback channel when the customer has no WhatsApp.">
        <SelectField
          label="Provider"
          name="sms_provider"
          defaultValue={initial.sms.provider}
          options={[
            { value: "twilio", label: "Twilio" },
            { value: "local", label: "Local Lebanese gateway" },
          ]}
        />
        <Field label="Account SID" name="sms_sid" defaultValue={initial.sms.sid} />
        <SecretField
          label="Auth token"
          name="sms_token"
          isSet={initial.sms.token_set}
        />
        <Field
          label="From number"
          name="sms_from"
          placeholder="+96170123456"
          defaultValue={initial.sms.from}
        />
      </Section>

      <Section icon={Radio} title="RADIUS gateway" description="Shared secret + IP allowlist for FreeRADIUS rlm_rest.">
        <SecretField
          label="Shared secret"
          name="radius_shared_secret"
          isSet={initial.radius.shared_secret_set}
        />
        <div className="space-y-1.5">
          <Label htmlFor="radius_allowed_ips">Allowed IPs (one per line, or commas)</Label>
          <Textarea
            id="radius_allowed_ips"
            name="radius_allowed_ips"
            rows={4}
            placeholder="10.0.0.5&#10;192.168.10.0/24"
            defaultValue={initial.radius.allowed_ips.join("\n")}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Only requests from these IPs will be accepted on the public RADIUS
            endpoints. Supports CIDR notation.
          </p>
        </div>
      </Section>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <header className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

function SecretField({
  label,
  name,
  isSet,
}: {
  label: string;
  name: string;
  isSet: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={name}>{label}</Label>
        {isSet ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Key className="size-3" />
            On file
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400">
            <Key className="size-3" />
            Not set
          </span>
        )}
      </div>
      <Input
        id={name}
        name={name}
        type="password"
        autoComplete="new-password"
        placeholder={isSet ? "•••••••• (leave blank to keep)" : "Paste new value"}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
