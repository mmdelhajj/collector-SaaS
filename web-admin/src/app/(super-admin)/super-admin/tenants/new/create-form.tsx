"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicPlan } from "@/lib/plans-public";
import type { CreateTenantResult } from "@/lib/super-admin";
import { createTenantAction } from "./actions";

export function CreateTenantForm({ plans }: { plans: PublicPlan[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<CreateTenantResult | null>(null);

  const [form, setForm] = useState({
    company_name: "",
    owner_name: "",
    owner_email: "",
    plan: "growth" as "starter" | "growth" | "pro",
    billing_period: "monthly" as "monthly" | "annual",
    trial_days: 14,
    status: "trial" as "trial" | "active",
  });

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function submit() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const res = await createTenantAction(form);
      if (res.ok) {
        setResult(res.result);
        toast.success("Tenant created");
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-300 bg-emerald-50/60 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 text-emerald-700 dark:text-emerald-400" />
          <div>
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
              {result.data.name} created
            </h2>
            <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-300/90">
              Plan: <b>{result.data.plan}</b> · Status:{" "}
              <b>{result.data.status}</b>
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Temporary password — share with the owner
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {result.owner.temporary_password}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(result.owner.temporary_password);
                toast.success("Copied");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Login email: <span className="font-mono">{result.owner.email}</span>
            <br />
            Send this via WhatsApp / Signal / in person —{" "}
            <span className="font-medium">never email it</span>. They should
            change it after first sign-in.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setResult(null);
              setForm({
                company_name: "",
                owner_name: "",
                owner_email: "",
                plan: "growth",
                billing_period: "monthly",
                trial_days: 14,
                status: "trial",
              });
            }}
          >
            Create another
          </Button>
          <Button
            type="button"
            onClick={() =>
              router.push(`/super-admin/tenants/${result.data.id}`)
            }
          >
            Open tenant
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5 rounded-2xl border bg-card p-6"
    >
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Section title="Company">
        <Field
          label="Company name"
          required
          value={form.company_name}
          onChange={(v) => set("company_name", v)}
          error={fieldErrors.company_name?.[0]}
          placeholder="Acme ISP"
        />
      </Section>

      <Section title="First owner user">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Owner name"
            required
            value={form.owner_name}
            onChange={(v) => set("owner_name", v)}
            error={fieldErrors.owner_name?.[0]}
            placeholder="John Smith"
          />
          <Field
            label="Owner email"
            type="email"
            required
            value={form.owner_email}
            onChange={(v) => set("owner_email", v)}
            error={fieldErrors.owner_email?.[0]}
            placeholder="john@acme.com"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          A 16-character password is auto-generated and shown once after
          creation. Copy it and share via a secure channel.
        </p>
      </Section>

      <Section title="Subscription">
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <div className="grid grid-cols-3 gap-2">
            {plans.map((p) => {
              const active = form.plan === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() =>
                    set("plan", p.code as "starter" | "growth" | "pro")
                  }
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    ${p.price_monthly}/mo
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Billing period"
            value={form.billing_period}
            onChange={(v) => set("billing_period", v as "monthly" | "annual")}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "annual", label: "Annual" },
            ]}
          />
          <Field
            label="Trial days"
            type="number"
            value={String(form.trial_days)}
            onChange={(v) => set("trial_days", Number(v) || 0)}
            error={fieldErrors.trial_days?.[0]}
          />
          <SelectField
            label="Initial status"
            value={form.status}
            onChange={(v) => set("status", v as "trial" | "active")}
            options={[
              { value: "trial", label: "Trial (free)" },
              { value: "active", label: "Active (paying)" },
            ]}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Set <b>active</b> only when the customer has already paid. Trial
          counts down 14 days from now (or whatever you set above).
        </p>
      </Section>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating workspace…
            </>
          ) : (
            "Create tenant"
          )}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  required,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
