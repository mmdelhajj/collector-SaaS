"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PinIcon = L.divIcon({
  className: "customer-location-pin",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid #fff;box-shadow:0 0 0 1px #dc2626"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type LatLng = [number, number];

export default function CustomerLocationMapInner({
  center,
  pin,
  onChange,
}: {
  center: LatLng;
  pin: LatLng | null;
  onChange: (latlng: LatLng) => void;
}) {
  return (
    <div className="h-[260px] w-full">
      <MapContainer
        center={center}
        zoom={pin ? 16 : 11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pin && (
          <Marker
            position={pin}
            icon={PinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const ll = m.getLatLng();
                onChange([ll.lat, ll.lng]);
              },
            }}
          />
        )}

        <ClickHandler onChange={onChange} />
        <Recenter pin={pin} />
      </MapContainer>
    </div>
  );
}

function ClickHandler({ onChange }: { onChange: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Pan to the pin when "Use my location" sets it from outside.
function Recenter({ pin }: { pin: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.setView(pin, Math.max(map.getZoom(), 15), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.[0], pin?.[1]]);
  return null;
}
