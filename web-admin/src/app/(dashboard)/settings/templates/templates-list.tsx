"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  TEMPLATE_LOCALES,
  type MessageTemplate,
  type TemplateChannel,
  type TemplateLocale,
} from "@/lib/templates-types";
import { cn } from "@/lib/utils";
import { createTemplateAction, updateTemplateAction } from "./actions";

type Group = {
  key: string;
  label: string;
  rows: MessageTemplate[];
};

const CHANNEL_ICONS: Record<TemplateChannel, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  sms: Smartphone,
  email: Mail,
};

const CHANNEL_STYLES: Record<TemplateChannel, string> = {
  whatsapp: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  sms: "bg-sky-50 text-sky-700 ring-sky-600/20",
  email: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

const LOCALE_LABEL: Record<TemplateLocale, string> = {
  en: "EN",
  ar: "AR",
  fr: "FR",
};

export function TemplatesList({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(groups[0]?.key ?? null);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <GroupBlock
          key={g.key}
          group={g}
          isOpen={open === g.key}
          onToggle={() => setOpen(open === g.key ? null : g.key)}
        />
      ))}
    </div>
  );
}

function GroupBlock({
  group,
  isOpen,
  onToggle,
}: {
  group: Group;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/30"
      >
        <div>
          <h3 className="text-sm font-semibold">{group.label}</h3>
          <p className="text-xs text-muted-foreground">
            {group.rows.length} variant{group.rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {isOpen ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2 border-t bg-muted/10 p-4">
          {group.rows.map((row) => (
            <TemplateRow key={row.id} template={row} />
          ))}
          <NewTemplateButton groupKey={group.key} groupLabel={group.label} />
        </div>
      )}
    </section>
  );
}

function TemplateRow({ template }: { template: MessageTemplate }) {
  const Icon = CHANNEL_ICONS[template.channel];
  return (
    <Sheet>
      <SheetTrigger className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
            CHANNEL_STYLES[template.channel],
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="capitalize">{template.channel}</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono">
              {LOCALE_LABEL[template.locale]}
            </span>
            {!template.is_active && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                disabled
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {template.subject ? (
              <span className="font-medium">{template.subject}</span>
            ) : (
              template.body.split("\n")[0]
            )}
          </div>
        </div>
      </SheetTrigger>
      <EditTemplateSheet template={template} />
    </Sheet>
  );
}

function EditTemplateSheet({ template }: { template: MessageTemplate }) {
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);
  const [active, setActive] = useState(template.is_active);

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", String(template.id));
      fd.set("subject", subject);
      fd.set("body", body);
      fd.set("is_active", active ? "1" : "0");
      const res = await updateTemplateAction(undefined, fd);
      if (res.ok) toast.success("Template saved");
      else toast.error(res.error ?? "Could not save");
    });
  }

  return (
    <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle>
          {template.channel.toUpperCase()} · {LOCALE_LABEL[template.locale]}
        </SheetTitle>
        <SheetDescription>
          Use <code>{"{{tenant_name}}"}</code>, <code>{"{{customer_name}}"}</code>,{" "}
          <code>{"{{amount}}"}</code>, <code>{"{{currency}}"}</code>,{" "}
          <code>{"{{invoice_number}}"}</code>, <code>{"{{receipt_url}}"}</code>.
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
        {template.channel === "email" && (
          <div className="space-y-1.5">
            <Label htmlFor="t-subject">Subject</Label>
            <Input
              id="t-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Payment received — {{tenant_name}}"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="t-body">Body</Label>
          <Textarea
            id="t-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 rounded border"
          />
          Active
        </label>
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
        <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
          Cancel
        </SheetClose>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}

function NewTemplateButton({
  groupKey,
  groupLabel,
}: {
  groupKey: string;
  groupLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<TemplateChannel>("whatsapp");
  const [locale, setLocale] = useState<TemplateLocale>("en");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);

  function handleCreate() {
    if (!body.trim()) {
      toast.error("Body is required");
      return;
    }
    startTransition(async () => {
      const res = await createTemplateAction({
        key: groupKey,
        channel,
        locale,
        subject: channel === "email" ? subject || null : null,
        body,
      });
      if (res.ok) {
        toast.success("Variant added");
        setOpen(false);
        setSubject("");
        setBody("");
      } else {
        toast.error(res.error ?? "Could not create");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed bg-card px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground">
        <Plus className="size-3.5" />
        Add variant
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>New variant — {groupLabel}</SheetTitle>
          <SheetDescription>
            Pick a channel + locale combination not yet covered.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-channel">Channel</Label>
              <select
                id="new-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as TemplateChannel)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-locale">Locale</Label>
              <select
                id="new-locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value as TemplateLocale)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {TEMPLATE_LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="new-subject">Subject</Label>
              <Input
                id="new-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="new-body">Body</Label>
            <Textarea
              id="new-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder="Hi {{customer_name}}, …"
            />
          </div>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button type="button" onClick={handleCreate} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
