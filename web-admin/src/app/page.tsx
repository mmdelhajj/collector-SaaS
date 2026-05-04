import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  MapPin,
  MessageCircle,
  Radio,
  Shield,
  Wallet,
} from "lucide-react";
import { listPublicPlans } from "@/lib/plans-public";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "ISP SaaS — billing, collectors, RADIUS, WhatsApp receipts",
  description:
    "All-in-one platform for ISPs and utility providers in MENA. Customer billing, door-to-door collectors with mobile app, RADIUS auto-suspend, WhatsApp receipts. Free 14-day trial.",
};

const FEATURES = [
  {
    icon: Wallet,
    title: "Cash & mobile money",
    body: "Cash, Whish, OMT, card, bank — every payment recorded with receipt, photo, GPS, signature. Auto-reconciles to invoices.",
  },
  {
    icon: MapPin,
    title: "Field collector module",
    body: "Daily route on a mobile app. Collectors see assignments, mark paid, receipts fire automatically — even offline.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp + SMS receipts",
    body: "PDF receipt sent via WhatsApp the moment a payment is recorded. Falls back to SMS if no WhatsApp number.",
  },
  {
    icon: Radio,
    title: "RADIUS integration",
    body: "Plug FreeRADIUS into our REST API. Suspended customers get walled-garden, paid ones reactivate within seconds.",
  },
  {
    icon: BarChart3,
    title: "Aging + collector reports",
    body: "Daily, weekly, monthly views per customer + per collector. Drill-down from year → month → day in two clicks.",
  },
  {
    icon: Shield,
    title: "Audit + 2FA built-in",
    body: "Every payment, role change, RADIUS action logged. TOTP 2FA for admins. Full multi-tenant isolation.",
  },
];

const HERO_STATS = [
  { value: "14 days", label: "Free trial, no card" },
  { value: "WhatsApp", label: "Auto-receipts day 1" },
  { value: "Lebanon", label: "Built for MENA" },
  { value: "RADIUS", label: "FreeRADIUS native" },
];

export default async function MarketingHome() {
  const plans = await listPublicPlans().catch(() => []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              Built for ISPs &amp; utility providers in Lebanon &amp; MENA
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              The billing platform your{" "}
              <span className="text-primary">collectors</span> actually use.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              Customers, invoices, door-to-door cash collection, WhatsApp
              receipts, RADIUS auto-suspend — all in one workspace. Replace your
              Excel + WhatsApp groups in an afternoon.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                Start free 14-day trial
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex h-11 items-center rounded-lg border bg-card px-6 text-sm font-semibold transition-colors hover:bg-muted/50"
              >
                See pricing
              </Link>
            </div>
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border bg-card p-3 text-center shadow-sm"
                >
                  <p className="text-base font-bold tracking-tight">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Built for the way Lebanese ISPs actually run
            </h2>
            <p className="mt-3 text-muted-foreground">
              No imported US software pretending door-to-door cash doesn&rsquo;t
              exist. Every feature from <em>real</em> field operations.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border bg-card p-6 shadow-sm"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Pricing that scales with your customer base
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every plan: 14-day free trial, no card required. Cancel anytime.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="mx-auto mt-10 max-w-md rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              Pricing is loading… please refresh in a moment.
            </div>
          ) : (
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
              {plans.map((p) => {
                const isPopular = p.code === "growth";
                return (
                  <div
                    key={p.code}
                    className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                      isPopular
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "bg-card"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-lg font-bold tracking-tight">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                    <p className="mt-5">
                      <span className="text-4xl font-bold tracking-tight">
                        ${p.price_monthly}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        /month
                      </span>
                    </p>
                    {p.price_annual && (
                      <p className="text-xs text-muted-foreground">
                        or ${p.price_annual}/year (save{" "}
                        {Math.round(
                          (1 - p.price_annual / 12 / p.price_monthly) * 100,
                        )}
                        %)
                      </p>
                    )}
                    <ul className="mt-6 space-y-2 text-sm">
                      <PlanLine
                        ok
                        text={
                          p.limits.customers
                            ? `Up to ${p.limits.customers.toLocaleString()} customers`
                            : "Unlimited customers"
                        }
                      />
                      <PlanLine
                        ok
                        text={
                          p.limits.users
                            ? `${p.limits.users} staff users`
                            : "Unlimited staff"
                        }
                      />
                      <PlanLine
                        ok
                        text={
                          p.limits.collectors
                            ? `${p.limits.collectors} field collector${p.limits.collectors === 1 ? "" : "s"}`
                            : "Unlimited collectors"
                        }
                      />
                      <PlanLine ok={p.features.radius} text="RADIUS gateway" />
                      <PlanLine
                        ok={p.features.whatsapp}
                        text="WhatsApp receipts"
                      />
                      <PlanLine ok={p.features.sms} text="SMS fallback" />
                      <PlanLine
                        ok={p.features.priority_support}
                        text="Priority support"
                      />
                    </ul>
                    <Link
                      href={`/signup?plan=${p.code}`}
                      className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 ${
                        isPopular
                          ? "bg-primary text-primary-foreground"
                          : "border bg-card hover:bg-muted/40"
                      }`}
                    >
                      Start {p.name} trial
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Stop chasing customers in WhatsApp groups.
          </h2>
          <p className="mt-2 text-muted-foreground">
            14 days free. No card. Cancel anytime. Sign up in 60 seconds.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            Start your trial
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="#pricing"
            className="hidden rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="ms-2 inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-background py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
        <p>© 2026 ISP SaaS. Built in Lebanon.</p>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <span className="inline-flex items-center gap-1">
            <Globe2 className="size-3" />
            EN · AR · FR
          </span>
        </div>
      </div>
    </footer>
  );
}

function PlanLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2
        className={`mt-0.5 size-4 shrink-0 ${
          ok ? "text-emerald-600" : "text-zinc-300 dark:text-zinc-700"
        }`}
      />
      <span className={ok ? "" : "text-muted-foreground/60 line-through"}>
        {text}
      </span>
    </li>
  );
}
