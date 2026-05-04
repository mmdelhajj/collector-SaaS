import { Lightbulb, Radio, Satellite, Tv, Wifi, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_BY_NAME: Record<string, typeof Wifi> = {
  Internet: Wifi,
  Electricity: Zap,
  Satellite: Satellite,
  Generator: Lightbulb,
  IPTV: Tv,
  Water: Radio,
};

const STYLE_BY_NAME: Record<string, string> = {
  Internet:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-400",
  Electricity:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400",
  Satellite:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/40 dark:text-violet-400",
  Generator:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950/40 dark:text-orange-400",
  IPTV:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400",
  Water:
    "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950/40 dark:text-cyan-400",
};

export function ServiceCategoryBadge({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  if (!name) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-zinc-100 text-zinc-500 ring-zinc-600/20",
          className,
        )}
      >
        Uncategorised
      </span>
    );
  }
  const Icon = ICON_BY_NAME[name] ?? Wifi;
  const style =
    STYLE_BY_NAME[name] ??
    "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900/60 dark:text-zinc-300";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        style,
        className,
      )}
    >
      <Icon className="size-3" />
      {name}
    </span>
  );
}
