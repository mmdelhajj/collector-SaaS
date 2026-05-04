import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type ComingSoonProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Optional list of features to ship with this page. */
  features?: string[];
};

export function ComingSoon({
  title,
  description,
  icon: Icon,
  features,
}: ComingSoonProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 lg:px-8">
      <div className="rounded-2xl border bg-card p-8 shadow-sm sm:p-12">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              <Sparkles className="size-3" />
              Coming soon
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        {features && features.length > 0 && (
          <div className="mt-8 border-t pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What this page will do
            </p>
            <ul className="space-y-2 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            Back to dashboard
            <ArrowRight className="size-4" />
          </Link>
          <p className="text-xs text-muted-foreground">
            We&rsquo;re shipping these in priority order — let us know which one
            you need first.
          </p>
        </div>
      </div>
    </div>
  );
}
