"use client";

import { useEffect, useState } from "react";

/**
 * Renders a date string in the user's local timezone — without hydration
 * mismatches.
 *
 * The trick: server-render a deterministic UTC slice (matches the client's
 * first render exactly), then after mount swap to the locale-aware format.
 * Both sides start identical, so React doesn't complain. The visual update
 * happens in the next paint, which is imperceptible.
 *
 * Use anywhere you'd previously written `new Date(iso).toLocaleString()` in
 * a Server or Client Component.
 */
export function LocalDateTime({
  iso,
  fallback = "—",
  mode = "datetime",
  options,
}: {
  iso: string | null | undefined;
  fallback?: string;
  mode?: "datetime" | "date" | "time";
  options?: Intl.DateTimeFormatOptions;
}) {
  // SSR + first client render: a deterministic ISO-derived slice that's
  // independent of timezone. After mount the effect upgrades to local.
  const initial = iso ? deterministicSlice(iso, mode) : fallback;
  const [text, setText] = useState(initial);

  useEffect(() => {
    if (!iso) {
      setText(fallback);
      return;
    }
    const d = new Date(iso);
    if (mode === "date") {
      setText(d.toLocaleDateString(undefined, options));
    } else if (mode === "time") {
      setText(d.toLocaleTimeString(undefined, options));
    } else {
      setText(d.toLocaleString(undefined, options));
    }
  }, [iso, mode, fallback, options]);

  return <>{text}</>;
}

function deterministicSlice(
  iso: string,
  mode: "datetime" | "date" | "time",
): string {
  // ISO 8601 looks like "2026-05-04T03:51:56+03:00" or "...Z". Slice the
  // calendar parts so the SSR string matches whatever the client uses for
  // its initial render.
  const tIdx = iso.indexOf("T");
  if (tIdx === -1) return iso;
  const date = iso.slice(0, tIdx);
  const time = iso.slice(tIdx + 1, tIdx + 9); // HH:MM:SS
  if (mode === "date") return date;
  if (mode === "time") return time;
  return `${date} ${time}`;
}
