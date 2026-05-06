"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createInvoiceAction,
  searchCustomersAction,
  type CreateInvoiceState,
  type CustomerHit,
} from "./actions";

type CustomerOption = CustomerHit;

type LineItem = {
  description: string;
  quantity: string;
  unit_price: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function lineTotal(item: LineItem): number {
  const q = Number(item.quantity || 0);
  const p = Number(item.unit_price || 0);
  return Number.isFinite(q * p) ? q * p : 0;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function NewInvoiceForm({
  initialCustomers,
}: {
  initialCustomers: CustomerOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    CreateInvoiceState | undefined,
    FormData
  >(createInvoiceAction, undefined);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CustomerOption[]>(initialCustomers);
  const [searching, setSearching] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [selected, setSelected] = useState<CustomerOption | null>(null);
  const [issuedAt, setIssuedAt] = useState(todayIso());
  const [dueAt, setDueAt] = useState(plusDaysIso(15));
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unit_price: "" },
  ]);

  // Debounced server-side search — fires 250ms after the user stops typing.
  // Empty query falls back to the first-paint "recent" list rather than
  // hammering the API with an empty match-all on every backspace.
  useEffect(() => {
    const q = search.trim();
    if (q === "") {
      setResults(initialCustomers);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchCustomersAction(q);
      setResults(res.hits);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [search, initialCustomers]);

  const subtotal = items.reduce((sum, it) => sum + lineTotal(it), 0);

  // Redirect to the invoice detail page once it's created.
  useEffect(() => {
    if (state?.ok && state.invoice) {
      toast.success(`Invoice ${state.invoice.number} created`);
      router.push(`/invoices/${state.invoice.id}`);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((curr) =>
      curr.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  function addItem() {
    setItems((curr) => [
      ...curr,
      { description: "", quantity: "1", unit_price: "" },
    ]);
  }

  function removeItem(idx: number) {
    setItems((curr) =>
      curr.length === 1 ? curr : curr.filter((_, i) => i !== idx),
    );
  }

  const fe = state?.fieldErrors ?? {};
  const itemsJson = JSON.stringify(
    items.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity || 0),
      unit_price: Number(it.unit_price || 0),
    })),
  );
  const selectedCustomer = selected;

  return (
    <form action={formAction} className="space-y-6">
      {/* Customer picker */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Customer</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Search by name, code, or city.
        </p>

        <div className="mt-3 space-y-2">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search customers by name, code, or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && (
              <Loader2 className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <input type="hidden" name="customer_id" value={customerId} />

          <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/20">
            {results.length === 0 && !searching && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {search.trim()
                  ? "No customers match this search."
                  : "Start typing to search customers."}
              </p>
            )}
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCustomerId(c.id);
                  setSelected(c);
                  setSearch(c.full_name);
                }}
                className={`flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted ${
                  customerId === c.id ? "bg-primary/10" : ""
                }`}
              >
                <span dir="auto">
                  <span className="font-medium">{c.full_name}</span>
                  {c.city && (
                    <span className="ms-2 text-xs text-muted-foreground">
                      {c.city}
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {c.code}
                </span>
              </button>
            ))}
          </div>

          {selectedCustomer && (
            <p className="text-xs text-muted-foreground">
              Selected:{" "}
              <span className="font-medium text-foreground" dir="auto">
                {selectedCustomer.full_name}
              </span>{" "}
              ({selectedCustomer.code})
            </p>
          )}
          {fe.customer_id?.[0] && (
            <p className="text-xs text-destructive">{fe.customer_id[0]}</p>
          )}
        </div>
      </section>

      {/* Dates */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Dates</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Issue date"
            error={fe.issued_at?.[0]}
            input={
              <Input
                type="date"
                name="issued_at"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                required
              />
            }
          />
          <FormField
            label="Due date"
            error={fe.due_at?.[0]}
            input={
              <Input
                type="date"
                name="due_at"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
              />
            }
          />
          <FormField
            label="Period start (optional)"
            input={
              <Input
                type="date"
                name="period_start"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            }
          />
          <FormField
            label="Period end (optional)"
            error={fe.period_end?.[0]}
            input={
              <Input
                type="date"
                name="period_end"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            }
          />
        </div>
      </section>

      {/* Line items */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Line items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add item
          </Button>
        </div>
        {fe.items?.[0] && (
          <p className="mt-2 text-xs text-destructive">{fe.items[0]}</p>
        )}

        <div className="mt-3 space-y-3">
          {items.map((it, idx) => {
            const itemErr = (key: string) =>
              fe[`items.${idx}.${key}`]?.[0] ?? null;
            return (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_90px_120px_36px] sm:items-end"
              >
                <FormField
                  label={idx === 0 ? "Description" : ""}
                  error={itemErr("description")}
                  input={
                    <Input
                      type="text"
                      placeholder="Internet — May 2026"
                      value={it.description}
                      onChange={(e) =>
                        updateItem(idx, { description: e.target.value })
                      }
                      dir="auto"
                    />
                  }
                />
                <FormField
                  label={idx === 0 ? "Qty" : ""}
                  error={itemErr("quantity")}
                  input={
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(idx, { quantity: e.target.value })
                      }
                      className="text-right"
                    />
                  }
                />
                <FormField
                  label={idx === 0 ? "Unit price" : ""}
                  error={itemErr("unit_price")}
                  input={
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={it.unit_price}
                      onChange={(e) =>
                        updateItem(idx, { unit_price: e.target.value })
                      }
                      className="text-right"
                    />
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  aria-label={`Remove item ${idx + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <input type="hidden" name="items_json" value={itemsJson} />

        <div className="mt-4 flex items-baseline justify-end gap-3 border-t pt-3 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-base font-semibold tabular-nums">
            {formatMoney(subtotal)}
          </span>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Notes (optional)</h2>
        <textarea
          name="notes"
          rows={3}
          placeholder="Anything the customer should see on the invoice…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          dir="auto"
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/invoices")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}

function FormField({
  label,
  input,
  error,
}: {
  label: string;
  input: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      {input}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
