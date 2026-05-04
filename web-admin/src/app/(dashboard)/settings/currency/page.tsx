import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe, History } from "lucide-react";
import { LocalDateTime } from "@/components/ui/local-datetime";
import { getCurrencySettings } from "@/lib/settings";
import { CurrencyForm } from "./currency-form";

export const metadata: Metadata = { title: "Currency · Settings" };

export default async function CurrencyPage() {
  const data = await getCurrencySettings();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Globe className="size-6 text-primary" />
          Currency &amp; exchange
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick your primary and secondary currencies, and keep today's rate up
          to date.
        </p>
      </div>

      <CurrencyForm
        initial={{
          currency_primary: data.currency_primary,
          currency_secondary: data.currency_secondary,
          exchange_rate: data.exchange_rate,
          exchange_rate_source: data.exchange_rate_source,
          exchange_rate_updated_at: data.exchange_rate_updated_at,
        }}
      />

      {data.exchange_rate_updated_at && (
        <section className="rounded-2xl border bg-card p-6">
          <header className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Rate change history</h2>
          </header>
          <p className="text-xs text-muted-foreground">
            Last 10 changes. Past invoices keep the rate that was in effect
            when they were issued.
          </p>

          {data.history.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No changes recorded yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pe-4 text-left">When</th>
                    <th className="py-2 pe-4 text-right">Old rate</th>
                    <th className="py-2 pe-4 text-right">New rate</th>
                    <th className="py-2 text-left">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.history.map((h, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="py-2 pe-4 text-xs text-muted-foreground">
                        <LocalDateTime iso={h.created_at} />
                      </td>
                      <td className="py-2 pe-4 text-right font-mono tabular-nums">
                        {h.old_rate !== null ? h.old_rate.toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pe-4 text-right font-mono tabular-nums font-semibold">
                        {h.new_rate !== null ? h.new_rate.toLocaleString() : "—"}
                      </td>
                      <td className="py-2 text-xs">
                        {h.user ? h.user.name : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
