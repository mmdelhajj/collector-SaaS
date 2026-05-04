"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
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
  TICKET_PRIORITIES,
  TICKET_TYPES,
  type TicketPriority,
  type TicketType,
} from "@/lib/tickets-types";
import { createTicketAction } from "./actions";

type CustomerOption = { id: string; code: string; full_name: string };

export function NewTicketSheet() {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState<TicketType>("install");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = new URL("/api/customer-search", window.location.origin);
        if (search) url.searchParams.set("q", search);
        const res = await fetch(url, { signal: ctrl.signal });
        if (res.ok) {
          const json = (await res.json()) as { data: CustomerOption[] };
          setCustomers(json.data);
        }
      } catch {
        /* ignored */
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [open, search]);

  function handleSubmit() {
    if (!customerId || !title.trim()) {
      toast.error("Customer and title are required");
      return;
    }
    startTransition(async () => {
      const res = await createTicketAction({
        customer_id: customerId,
        type,
        priority,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
      });
      if (res.ok) {
        toast.success("Ticket created");
        setOpen(false);
        setCustomerId("");
        setTitle("");
        setDescription("");
        setScheduled("");
      } else {
        toast.error(res.error ?? "Could not create");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
        <Plus className="size-4" />
        New ticket
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New ticket</SheetTitle>
          <SheetDescription>
            Create a work order for an installation, repair, disconnect, or
            support request.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="t-customer-search">Customer</Label>
            <Input
              id="t-customer-search"
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border bg-card">
              {customers.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Type to search customers.
                </p>
              ) : (
                customers.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCustomerId(c.id)}
                    className={`flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40 ${
                      customerId === c.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <span>{c.full_name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.code}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-type">Type</Label>
              <select
                id="t-type"
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-priority">Priority</Label>
              <select
                id="t-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input
              id="t-title"
              placeholder="Install fiber router at apartment 3B"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-description">Description</Label>
            <Textarea
              id="t-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-schedule">Scheduled</Label>
            <Input
              id="t-schedule"
              type="datetime-local"
              value={scheduled}
              onChange={(e) => setScheduled(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <SheetClose className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">
            Cancel
          </SheetClose>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create ticket"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
