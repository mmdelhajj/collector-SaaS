"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CURRENCIES,
  LOCALES,
  TIMEZONES,
  type WorkspaceSettings,
} from "@/lib/settings-types";
import {
  updateWorkspaceAction,
  type WorkspaceFormState,
} from "./actions";

export function WorkspaceForm({ initial }: { initial: WorkspaceSettings }) {
  const [state, formAction, isPending] = useActionState<
    WorkspaceFormState | undefined,
    FormData
  >(updateWorkspaceAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Workspace saved");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
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

      <Section title="Branding" description="How your workspace appears to staff and customers.">
        <Field label="Workspace name" name="name" defaultValue={initial.name} required errors={fe.name} />
        <Field
          label="Logo URL"
          name="logo_url"
          type="url"
          placeholder="https://cdn.yourcompany.com/logo.png"
          defaultValue={initial.logo_url ?? ""}
          errors={fe.logo_url}
        />
        <div className="space-y-1.5">
          <Label htmlFor="primary_color">Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              id="primary_color"
              name="primary_color"
              type="color"
              defaultValue={initial.primary_color ?? "#0ea5e9"}
              className="h-9 w-14 cursor-pointer rounded-md border bg-transparent"
            />
            <span className="text-xs text-muted-foreground">
              Used for buttons, links, and the customer portal accent.
            </span>
          </div>
          {fe.primary_color?.[0] && (
            <p className="text-xs text-destructive">{fe.primary_color[0]}</p>
          )}
        </div>
      </Section>

      <Section title="Currency" description="Primary currency is used for all invoices. Secondary is shown alongside.">
        <SelectField label="Primary currency" name="currency_primary" defaultValue={initial.currency_primary} options={CURRENCIES} required errors={fe.currency_primary} />
        <SelectField
          label="Secondary currency"
          name="currency_secondary"
          defaultValue={initial.currency_secondary ?? ""}
          options={[{ value: "", label: "— None —" }, ...CURRENCIES]}
          errors={fe.currency_secondary}
        />
        <Field
          label="Exchange rate (1 primary = X secondary)"
          name="exchange_rate"
          type="number"
          step="0.0001"
          placeholder="89500"
          defaultValue={initial.exchange_rate ?? ""}
          errors={fe.exchange_rate}
        />
      </Section>

      <Section title="Locale" description="Default language and timezone for new staff and dated reports.">
        <SelectField label="Locale" name="locale" defaultValue={initial.locale} options={LOCALES} required errors={fe.locale} />
        <SelectField
          label="Timezone"
          name="timezone"
          defaultValue={initial.timezone}
          options={TIMEZONES.map((t) => ({ value: t, label: t }))}
          required
          errors={fe.timezone}
        />
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
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <header>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
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
  required,
  step,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  step?: string;
  errors?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        required={required}
        step={step}
        aria-invalid={Boolean(errors?.length)}
      />
      {errors?.[0] && <p className="text-xs text-destructive">{errors[0]}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  required,
  errors,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
  errors?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {errors?.[0] && <p className="text-xs text-destructive">{errors[0]}</p>}
    </div>
  );
}
