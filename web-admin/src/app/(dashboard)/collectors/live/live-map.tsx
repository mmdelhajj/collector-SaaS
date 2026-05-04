"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Banknote, Clock, Wifi, WifiOff } from "lucide-react";
import type { CollectorZone } from "@/lib/zones-types";

type LiveCollector = {
  collector: { id: number | null; name: string };
  latitude: number;
  longitude: number;
  last_ping_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  is_active: boolean;
  total_collected: number;
};

const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018];
const POLL_MS = 10_000;

function makeIcon(active: boolean) {
  const color = active ? "#10b981" : "#94a3b8";
  return L.divIcon({
    className: "live-collector-pin",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 1px ${color}, 0 0 8px rgba(16,185,129,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const ACTIVE_ICON = makeIcon(true);
const INACTIVE_ICON = makeIcon(false);

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function LiveMap({ zones }: { zones: CollectorZone[] }) {
  const [collectors, setCollectors] = useState<LiveCollector[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/collector-live", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data: LiveCollector[] };
        if (!cancelled) {
          setCollectors(json.data);
          setLastFetched(new Date());
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      }
    }
    load();
    intervalRef.current = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const center =
    collectors.find((c) => c.is_active)?.latitude !== undefined
      ? [collectors[0].latitude, collectors[0].longitude]
      : DEFAULT_CENTER;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            {collectors.filter((c) => c.is_active).length} active
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-zinc-400" />
            {collectors.filter((c) => !c.is_active).length} ended
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error ? (
            <span className="inline-flex items-center gap-1 text-rose-600">
              <WifiOff className="size-3" />
              {error}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Wifi className="size-3" />
              Live
            </span>
          )}
          {lastFetched && (
            <span className="text-muted-foreground">
              · updated {lastFetched.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="h-[640px] w-full">
          <MapContainer
            center={center as [number, number]}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {zones.map((z) => (
              <Polygon
                key={z.id}
                positions={z.polygon as L.LatLngExpression[]}
                pathOptions={{
                  color: z.color,
                  weight: 1.5,
                  fillOpacity: 0.08,
                }}
              />
            ))}

            {collectors.map((c, i) => (
              <Marker
                key={c.collector.id ?? i}
                position={[c.latitude, c.longitude]}
                icon={c.is_active ? ACTIVE_ICON : INACTIVE_ICON}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    <p className="text-sm font-semibold">
                      {c.collector.name}
                    </p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3" />
                      {timeAgo(c.last_ping_at)}
                    </p>
                    <p className="flex items-center gap-1">
                      <Banknote className="size-3 text-emerald-600" />
                      <span className="font-mono">
                        ${c.total_collected.toFixed(2)} today
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      {c.is_active ? "On route" : "Day ended"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
