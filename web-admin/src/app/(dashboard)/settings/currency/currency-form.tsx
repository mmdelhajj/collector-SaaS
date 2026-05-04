"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Sparkles, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalDateTime } from "@/components/ui/local-datetime";
import { refreshRateAction, saveCurrencyAction } from "./actions";

const CURRENCIES = [
  { code: "USD", label: "US Dollar (USD)" },
  { code: "LBP", label: "Lebanese Pound (LBP)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "AED", label: "UAE Dirham (AED)" },
  { code: "SAR", label: "Saudi Riyal (SAR)" },
  { code: "EGP", label: "Egyptian Pound (EGP)" },
  { code: "JOD", label: "Jordanian Dinar (JOD)" },
];

type Initial = {
  currency_primary: string;
  currency_secondary: string | null;
  exchange_rate: number | null;
  exchange_rate_source: "manual" | "auto";
  exchange_rate_updated_at: string | null;
};

export function CurrencyForm({ initial }: { initial: Initial }) {
  const [primary, setPrimary] = useState(initial.currency_primary);
  const [secondary, setSecondary] = useState(initial.currency_secondary ?? "");
  const [source, setSource] = useState<"manual" | "auto">(
    initial.exchange_rate_source,
  );
  const [rate, setRate] = useState(
    initial.exchange_rate !== null ? String(initial.exchange_rate) : "",
  );
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, startRefreshing] = useTransition();

  const showRate = secondary && secondary !== primary;
  const isAuto = source === "auto";

  function save() {
    if (showRate && !isAuto) {
      const num = Number(rate);
      if (!rate || isNaN(num) || num <= 0) {
        toast.error("Enter a positive exchange rate");
        return;
      }
    }
    startTransition(async () => {
      const res = await saveCurrencyAction({
        currency_primary: primary,
        currency_secondary: secondary || null,
        exchange_rate: showRate && !isAuto ? Number(rate) : null,
        exchange_rate_source: source,
      });
      if (res.ok) toast.success("Currency settings saved");
      else toast.error(res.error ?? "Save failed");
    });
  }

  function refresh() {
    startRefreshing(async () => {
      const res = await refreshRateAction();
      if (res.ok) toast.success("Rate refreshed");
      else toast.error(res.error ?? "Refresh failed");
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <header>
        <h2 className="text-base font-semibold">Currencies</h2>
        <p className="text-xs text-muted-foreground">
          Primary is used for invoices, payments, and reports. Secondary is
          shown alongside (e.g. "$50 ≈ 4,475,000 LBP").
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="primary">Primary currency</Label>
          <select
            id="primary"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="secondary">Secondary (optional)</Label>
          <select
            id="secondary"
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">— None (single-currency tenant) —</option>
            {CURRENCIES.filter((c) => c.code !== primary).map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showRate && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          {/* Source toggle */}
          <div className="grid grid-cols-2 gap-2">
            <SourcePick
              active={source === "manual"}
              icon={UserCog}
              title="Manual"
              hint="Type the rate yourself."
              onClick={() => setSource("manual")}
            />
            <SourcePick
              active={source === "auto"}
              icon={Sparkles}
              title="Auto (daily)"
              hint="open.er-api.com — free, no key. Fetched once per day at 06:00."
              onClick={() => setSource("auto")}
            />
          </div>

          <div>
            <Label htmlFor="rate" className="font-semibold">
              Exchange rate
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              How many{" "}
              <span className="font-mono font-semibold">{secondary}</span> equal
              1 <span className="font-mono font-semibold">{primary}</span>?
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">1 {primary} =</span>
              <Input
                id="rate"
                type="number"
                min={0}
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="max-w-[200px]"
                disabled={isAuto}
                readOnly={isAuto}
              />
              <span className="font-mono text-sm">{secondary}</span>
              {isAuto && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isRefreshing}
                  className="ms-auto gap-1.5"
                >
                  {isRefreshing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Refresh now
                </Button>
              )}
            </div>
            {isAuto && initial.exchange_rate_updated_at && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Last fetched{" "}
                <LocalDateTime iso={initial.exchange_rate_updated_at} />
              </p>
            )}
            {!isAuto && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Switch to <span className="font-semibold">Auto</span> if you
                want the rate to update itself daily.
              </p>
            )}
          </div>
        </div>
      )}

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

function SourcePick({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "hover:bg-background"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`}
        />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </button>
  );
}
