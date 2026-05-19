"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Banknote, Clock, Crosshair, Wifi, WifiOff, X } from "lucide-react";
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
const DEFAULT_ZOOM = 11;
const FOCUS_ZOOM = 15;
const POLL_MS = 10_000;

function makeIcon(active: boolean, focused = false) {
  const color = active ? "#10b981" : "#94a3b8";
  const ring = focused ? "#0ea5e9" : color;
  const ringWidth = focused ? 3 : 1;
  return L.divIcon({
    className: "live-collector-pin",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 ${ringWidth}px ${ring}, 0 0 8px rgba(16,185,129,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const ACTIVE_ICON = makeIcon(true);
const INACTIVE_ICON = makeIcon(false);
const ACTIVE_FOCUSED_ICON = makeIcon(true, true);
const INACTIVE_FOCUSED_ICON = makeIcon(false, true);

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

/**
 * Imperatively pan / fit the map whenever collectors data or focus changes.
 * - If a single collector is focused, pan to that collector at a tight zoom.
 * - Otherwise, fit bounds around all active collectors.
 * - Only auto-moves the camera when the user hasn't manually panned recently
 *   (so manual zoom-in isn't fought by the next poll tick).
 */
function MapAutoFollow({
  collectors,
  focusedId,
}: {
  collectors: LiveCollector[];
  focusedId: number | null;
}) {
  const map = useMap();
  // First render → fit/zoom unconditionally. After that, respect user.
  const userTouched = useRef(false);
  const focusedRef = useRef<number | null>(null);

  useEffect(() => {
    function onUserMove() {
      userTouched.current = true;
    }
    // dragstart fires on pan, zoomstart on user zoom. We don't tag programmatic
    // moves because setView / fitBounds emit movestart instead.
    map.on("dragstart", onUserMove);
    map.on("zoomstart", onUserMove);
    return () => {
      map.off("dragstart", onUserMove);
      map.off("zoomstart", onUserMove);
    };
  }, [map]);

  useEffect(() => {
    // Switching focus is always honoured — that's an explicit user intent.
    const focusChanged = focusedRef.current !== focusedId;
    focusedRef.current = focusedId;
    if (focusChanged) userTouched.current = false;

    if (focusedId !== null) {
      const target = collectors.find((c) => c.collector.id === focusedId);
      if (target) {
        if (focusChanged) {
          map.setView([target.latitude, target.longitude], FOCUS_ZOOM, {
            animate: true,
          });
        } else if (!userTouched.current) {
          // Subsequent polls — just pan, keep the user's chosen zoom.
          map.panTo([target.latitude, target.longitude], { animate: true });
        }
      }
      return;
    }

    if (userTouched.current) return;

    const active = collectors.filter((c) => c.is_active);
    const points = (active.length > 0 ? active : collectors).map(
      (c) => [c.latitude, c.longitude] as [number, number],
    );
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], DEFAULT_ZOOM, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points), {
      padding: [40, 40],
      maxZoom: 14,
      animate: true,
    });
  }, [map, collectors, focusedId]);

  return null;
}

export function LiveMap({ zones }: { zones: CollectorZone[] }) {
  const [collectors, setCollectors] = useState<LiveCollector[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
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

  // Sorted for the side list: active first, then by most-recent ping.
  const sorted = useMemo(() => {
    return [...collectors].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      const aT = a.last_ping_at ? new Date(a.last_ping_at).getTime() : 0;
      const bT = b.last_ping_at ? new Date(b.last_ping_at).getTime() : 0;
      return bT - aT;
    });
  }, [collectors]);

  const focused = focusedId !== null
    ? collectors.find((c) => c.collector.id === focusedId)
    : null;

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
          {focused && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
              <Crosshair className="size-3" />
              Following {focused.collector.name}
              <button
                type="button"
                onClick={() => setFocusedId(null)}
                className="ml-1 inline-flex size-4 items-center justify-center rounded-full hover:bg-sky-200"
                aria-label="Clear focus"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
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

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="h-[640px] w-full">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapAutoFollow collectors={collectors} focusedId={focusedId} />

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

              {collectors.map((c, i) => {
                const isFocused = c.collector.id === focusedId;
                const icon = c.is_active
                  ? isFocused
                    ? ACTIVE_FOCUSED_ICON
                    : ACTIVE_ICON
                  : isFocused
                    ? INACTIVE_FOCUSED_ICON
                    : INACTIVE_ICON;
                return (
                  <Marker
                    key={c.collector.id ?? i}
                    position={[c.latitude, c.longitude]}
                    icon={icon}
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
                        {c.collector.id !== null && (
                          <button
                            type="button"
                            onClick={() =>
                              setFocusedId(
                                isFocused ? null : c.collector.id,
                              )
                            }
                            className="mt-1 inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
                          >
                            <Crosshair className="size-3" />
                            {isFocused ? "Stop following" : "Follow"}
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <aside className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            Collectors ({collectors.length})
          </div>
          <ul className="max-h-[640px] overflow-y-auto">
            {sorted.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                No collectors on duty yet today.
              </li>
            )}
            {sorted.map((c, i) => {
              const isFocused = c.collector.id === focusedId;
              return (
                <li
                  key={c.collector.id ?? i}
                  className={`border-b last:border-b-0 ${
                    isFocused ? "bg-sky-50" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setFocusedId(
                        isFocused
                          ? null
                          : c.collector.id !== null
                            ? c.collector.id
                            : null,
                      )
                    }
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
                    disabled={c.collector.id === null}
                  >
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${
                        c.is_active ? "bg-emerald-500" : "bg-zinc-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {c.collector.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(c.last_ping_at)} · $
                        {c.total_collected.toFixed(2)}
                      </span>
                    </span>
                    {isFocused && (
                      <Crosshair className="size-3 shrink-0 text-sky-600" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
