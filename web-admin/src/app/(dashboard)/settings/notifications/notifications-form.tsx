"use client";

import { useActionState, useEffect } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NotificationSettings } from "@/lib/settings";
import { updateNotificationsAction, type NotifFormState } from "./actions";

export function NotificationsForm({
  initial,
}: {
  initial: NotificationSettings;
}) {
  const [state, formAction, isPending] = useActionState<
    NotifFormState | undefined,
    FormData
  >(updateNotificationsAction, undefined);

  useEffect(() => {
    if (state?.ok) toast.success("Saved");
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

      <Section
        icon={Bell}
        title="Channels"
        description="Where automated messages are sent."
      >
        <Toggle
          name="whatsapp_enabled"
          label="WhatsApp"
          description="Primary channel for receipts and reminders."
          icon={MessageCircle}
          defaultChecked={initial.whatsapp_enabled}
        />
        <Toggle
          name="sms_enabled"
          label="SMS"
          description="Fallback when no WhatsApp number on file."
          icon={Smartphone}
          defaultChecked={initial.sms_enabled}
        />
        <Toggle
          name="email_enabled"
          label="Email"
          description="Sent if a customer email exists."
          icon={Mail}
          defaultChecked={initial.email_enabled}
        />
      </Section>

      <Section
        icon={Bell}
        title="Triggers"
        description="When to send messages automatically."
      >
        <Toggle
          name="send_invoice_on_create"
          label="Send invoice on creation"
          description="Customer is notified the moment an invoice is issued."
          defaultChecked={initial.send_invoice_on_create}
        />
        <Toggle
          name="send_receipt_on_payment"
          label="Send receipt on payment"
          description="Auto-deliver PDF receipt after payment is recorded."
          defaultChecked={initial.send_receipt_on_payment}
        />
      </Section>

      <Section
        icon={Clock}
        title="Schedule"
        description="Days before due to remind, days after due to chase. Comma- or space-separated."
      >
        <Field
          label="Reminder days before due"
          name="reminder_days_before"
          placeholder="5, 2"
          defaultValue={initial.reminder_days_before.join(", ")}
        />
        <Field
          label="Overdue days after due"
          name="overdue_days_after"
          placeholder="1, 3, 7"
          defaultValue={initial.overdue_days_after.join(", ")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Quiet hours start"
            name="quiet_hours_start"
            type="time"
            defaultValue={initial.quiet_hours_start ?? "21:00"}
          />
          <Field
            label="Quiet hours end"
            name="quiet_hours_end"
            type="time"
            defaultValue={initial.quiet_hours_end ?? "08:00"}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Messages scheduled inside the quiet window are delayed until quiet
          hours end.
        </p>
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
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Toggle({
  name,
  label,
  description,
  icon: Icon,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/30">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border"
      />
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {label}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
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
