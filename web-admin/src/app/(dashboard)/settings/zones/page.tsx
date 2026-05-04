import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Map } from "lucide-react";
import { listZones } from "@/lib/zones";
import { listCollectors } from "@/lib/users";
import { ZonesEditor } from "./zones-editor";

export const metadata: Metadata = { title: "Zones · Settings" };

export default async function ZonesPage() {
  const [zones, collectors] = await Promise.all([
    listZones(),
    listCollectors().catch(() => []),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Map className="size-6 text-primary" />
          Zones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Coverage polygons for collectors. Click on the map to add vertices,
          then save. Each zone can have a default collector.
        </p>
      </div>

      <ZonesEditor
        initialZones={zones}
        collectors={collectors.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
