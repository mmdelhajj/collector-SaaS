import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { listZones } from "@/lib/zones";
import { LiveMapClient } from "./live-map-client";

export const metadata: Metadata = { title: "Live map · Collectors" };

export default async function LiveCollectorsPage() {
  const zones = await listZones().catch(() => []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MapPin className="size-6 text-primary" />
          Live collectors
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time positions from the mobile app, refreshed every 10 seconds.
          Each pin shows the last GPS ping.
        </p>
      </div>

      <LiveMapClient zones={zones} />
    </div>
  );
}
