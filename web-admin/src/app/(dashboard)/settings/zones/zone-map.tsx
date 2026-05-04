"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CollectorZone } from "@/lib/zones-types";

// Default center: Beirut. Most users will pan from there.
const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018];
const DEFAULT_ZOOM = 11;

// Patch leaflet's default icon paths (broken in bundlers).
const PinIcon = L.divIcon({
  className: "zone-vertex-pin",
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 0 1px #0ea5e9"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export function ZoneMap({
  zones,
  draftPolygon,
  draftColor,
  onAddPoint,
}: {
  zones: CollectorZone[];
  draftPolygon: Array<[number, number]>;
  draftColor: string;
  onAddPoint: (latlng: [number, number]) => void;
}) {
  return (
    <div className="h-[480px] w-full">
      <MapContainer
        center={
          draftPolygon[0] ??
          (zones[0]?.polygon[0] as [number, number] | undefined) ??
          DEFAULT_CENTER
        }
        zoom={DEFAULT_ZOOM}
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
              weight: 2,
              fillOpacity: 0.15,
            }}
          />
        ))}

        {draftPolygon.length >= 3 && (
          <Polygon
            positions={draftPolygon as L.LatLngExpression[]}
            pathOptions={{
              color: draftColor,
              weight: 2,
              dashArray: "6 6",
              fillOpacity: 0.2,
            }}
          />
        )}
        {draftPolygon.length === 2 && (
          <Polyline
            positions={draftPolygon as L.LatLngExpression[]}
            pathOptions={{ color: draftColor, weight: 2, dashArray: "6 6" }}
          />
        )}

        {draftPolygon.map((p, i) => (
          <Marker key={i} position={p as L.LatLngExpression} icon={PinIcon} />
        ))}

        <ClickHandler onAdd={onAddPoint} />
        <FitDraft draft={draftPolygon} />
      </MapContainer>
    </div>
  );
}

function ClickHandler({
  onAdd,
}: {
  onAdd: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function FitDraft({ draft }: { draft: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (draft.length >= 2) {
      const bounds = L.latLngBounds(draft as L.LatLngExpression[]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    // intentionally only when length crosses 2 — don't refit on every click
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.length === 2]);
  return null;
}
