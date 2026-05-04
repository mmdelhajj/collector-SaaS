"use client";

import { useTransition } from "react";
import { Globe, Loader2 } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { setLocaleAction } from "./locale-switcher-action";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const [isPending, startTransition] = useTransition();

  function change(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      // Force a reload so server components re-render with the new dir/lang attrs.
      window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
      <Globe className="ms-1.5 size-3 text-muted-foreground" />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          disabled={isPending}
          className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
            current === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={LOCALE_LABELS[l]}
        >
          {l.toUpperCase()}
          {isPending && current === l && (
            <Loader2 className="ms-1 inline size-3 animate-spin" />
          )}
        </button>
      ))}
    </div>
  );
}
