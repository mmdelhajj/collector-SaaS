"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { CollectorZone } from "@/lib/zones-types";

const LiveMap = dynamic(() => import("./live-map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[640px] items-center justify-center rounded-xl border bg-muted/20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function LiveMapClient({ zones }: { zones: CollectorZone[] }) {
  return <LiveMap zones={zones} />;
}
