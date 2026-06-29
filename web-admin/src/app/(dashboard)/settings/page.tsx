import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CircleDollarSign,
  CreditCard,
  FileClock,
  Globe,
  Map,
  MessageSquare,
  ShieldCheck,
  UserCircle2,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

type Card = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  ready: boolean;
};

type Group = {
  title: string;
  description: string;
  cards: Card[];
};

// Grouped into 4 plain-language sections so a non-technical owner isn't faced
// with 13 equal cards. Advanced (RADIUS secret, payment routing, zones) is
// last and clearly labelled as the rarely-touched stuff.
const GROUPS: Group[] = [
  {
    title: "My account",
    description: "Just you — profile and sign-in security.",
    cards: [
      {
        title: "My profile",
        description: "Name, photo, password, language, and timezone.",
        icon: UserCircle2,
        href: "/profile",
        ready: true,
      },
      {
        title: "Security (2FA)",
        description: "Enable two-factor authentication for your account.",
        icon: ShieldCheck,
        href: "/settings/security",
        ready: true,
      },
    ],
  },
  {
    title: "Team & roles",
    description: "Who works with you and what they can do.",
    cards: [
      {
        title: "Users & roles",
        description:
          "Invite teammates, change roles, deactivate departed staff.",
        icon: Users,
        href: "/settings/users",
        ready: true,
      },
      {
        title: "Permissions grid",
        description: "Read-only role → permission matrix.",
        icon: ShieldCheck,
        href: "/settings/roles",
        ready: true,
      },
    ],
  },
  {
    title: "Billing & currency",
    description: "Your plan, money settings, and workspace branding.",
    cards: [
      {
        title: "Subscription & billing",
        description: "Your plan, usage, trial countdown, and plan changes.",
        icon: CreditCard,
        href: "/settings/billing",
        ready: true,
      },
      {
        title: "Currency & exchange",
        description: "Primary/secondary currencies and daily exchange rate.",
        icon: Globe,
        href: "/settings/currency",
        ready: true,
      },
      {
        title: "Workspace",
        description: "Name, logo, primary color, currency, timezone, locale.",
        icon: Building2,
        href: "/settings/workspace",
        ready: true,
      },
      {
        title: "Notifications",
        description:
          "Channel toggles, reminder days, overdue days, quiet hours.",
        icon: Bell,
        href: "/settings/notifications",
        ready: true,
      },
    ],
  },
  {
    title: "Advanced",
    description: "Technical setup you rarely need to change.",
    cards: [
      {
        title: "Integrations",
        description: "WhatsApp provider, Twilio, FreeRADIUS shared secret.",
        icon: Wrench,
        href: "/settings/integrations",
        ready: true,
      },
      {
        title: "Payment routing",
        description:
          "Which methods pass through the collector vs go direct to your wallet.",
        icon: CircleDollarSign,
        href: "/settings/payments",
        ready: true,
      },
      {
        title: "Message templates",
        description: "WhatsApp, SMS, and email content per locale.",
        icon: MessageSquare,
        href: "/settings/templates",
        ready: true,
      },
      {
        title: "Zones",
        description: "Draw collector coverage polygons on the map.",
        icon: Map,
        href: "/settings/zones",
        ready: true,
      },
      {
        title: "Audit log",
        description:
          "Every payment, role change, and admin action — with timestamps.",
        icon: FileClock,
        href: "/settings/audit",
        ready: true,
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace, team, branding, currency, and integrations.
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {group.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {group.description}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map((c) => (
              <SettingsCard key={c.href} card={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SettingsCard({ card }: { card: Card }) {
  const Icon = card.icon;
  const inner = (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        {!card.ready && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400">
            Soon
          </span>
        )}
      </div>
      <h2 className="mt-3 font-semibold tracking-tight">{card.title}</h2>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">
        {card.description}
      </p>
      {card.ready && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          Open
          <ArrowRight className="size-3" />
        </span>
      )}
    </div>
  );

  if (card.ready) {
    return (
      <Link href={card.href} className="group block">
        {inner}
      </Link>
    );
  }
  return <div className="cursor-not-allowed opacity-60">{inner}</div>;
}
