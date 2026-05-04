"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Key,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSmtpAction, testSmtpAction } from "./actions";

type SmtpInitial = {
  host: string;
  port: number;
  username: string;
  password_set: boolean;
  encryption: "tls" | "ssl" | "none";
  from_address: string;
  from_name: string;
};

export function SmtpForm({ initial }: { initial: SmtpInitial }) {
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  const [username, setUsername] = useState(initial.username);
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState(initial.encryption);
  const [fromAddress, setFromAddress] = useState(initial.from_address);
  const [fromName, setFromName] = useState(initial.from_name);
  const [testTo, setTestTo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function save() {
    startTransition(async () => {
      const res = await saveSmtpAction({
        host,
        port,
        username,
        password: password || undefined,
        encryption,
        from_address: fromAddress,
        from_name: fromName,
      });
      if (res.ok) {
        setPassword("");
        toast.success("SMTP saved");
      } else toast.error(res.error ?? "Save failed");
    });
  }

  function runTest() {
    if (!testTo) {
      toast.error("Enter a test address");
      return;
    }
    setTestResult(null);
    startTesting(async () => {
      const res = await testSmtpAction(testTo);
      setTestResult(res);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <header className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Mail className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">SMTP / outbound email</h2>
          <p className="text-xs text-muted-foreground">
            Used for trial reminders, dunning, super-admin alerts, and tenant
            invitations. Tenant-level WhatsApp/SMS settings live in their own
            Integrations panel.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Host"
          value={host}
          onChange={setHost}
          placeholder="smtp.gmail.com"
        />
        <Field
          label="Port"
          type="number"
          value={String(port)}
          onChange={(v) => setPort(Number(v) || 0)}
          placeholder="587"
        />
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="postmaster@your-domain.com"
        />
        <SecretField
          label="Password"
          value={password}
          onChange={setPassword}
          isSet={initial.password_set}
        />
        <SelectField
          label="Encryption"
          value={encryption}
          onChange={(v) => setEncryption(v as "tls" | "ssl" | "none")}
          options={[
            { value: "tls", label: "TLS (port 587, recommended)" },
            { value: "ssl", label: "SSL (port 465)" },
            { value: "none", label: "None (insecure, debug only)" },
          ]}
        />
        <div />
        <Field
          label="From address"
          value={fromAddress}
          onChange={setFromAddress}
          placeholder="no-reply@your-domain.com"
        />
        <Field
          label="From name"
          value={fromName}
          onChange={setFromName}
          placeholder="ISP SaaS"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Save SMTP"
          )}
        </Button>
      </div>

      {/* Test send */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Send test email
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            type="email"
            placeholder="you@example.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={runTest}
            disabled={isTesting || !host}
          >
            {isTesting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send test
          </Button>
        </div>
        {testResult && (
          <div
            className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              testResult.ok
                ? "border-emerald-300 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/30"
                : "border-rose-300 bg-rose-50/60 text-rose-800 dark:bg-rose-950/30"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">
          Save your settings first, then send a test. The test uses the values
          currently saved in the database.
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SecretField({
  label,
  value,
  onChange,
  isSet,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isSet: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {isSet ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            <Key className="size-3" />
            On file
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-600/20">
            <Key className="size-3" />
            Not set
          </span>
        )}
      </div>
      <Input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          isSet ? "•••••••• (leave blank to keep)" : "Paste new value"
        }
      />
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
