"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, MapPin, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Default: Beirut. Same as zone-map.
const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018];

// Leaflet pulls window/document on import — load only on the client.
const MapInner = dynamic(() => import("./customer-location-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] w-full items-center justify-center rounded-md border bg-muted/30 text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function CustomerLocationPicker({
  defaultLat,
  defaultLng,
  errors,
}: {
  defaultLat?: number | null;
  defaultLng?: number | null;
  errors?: { latitude?: string[]; longitude?: string[] };
}) {
  const initial = useMemo<[number, number] | null>(() => {
    if (
      typeof defaultLat === "number" &&
      typeof defaultLng === "number" &&
      Number.isFinite(defaultLat) &&
      Number.isFinite(defaultLng)
    ) {
      return [defaultLat, defaultLng];
    }
    return null;
  }, [defaultLat, defaultLng]);

  const [pin, setPin] = useState<[number, number] | null>(initial);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // If parent re-renders with new defaults (e.g. switching customers), follow.
  useEffect(() => {
    setPin(initial);
  }, [initial]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation not supported by this browser.");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin([pos.coords.latitude, pos.coords.longitude]);
        setGeoBusy(false);
      },
      (err) => {
        setGeoError(err.message || "Could not get your location.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          Location pin
        </Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useMyLocation}
            disabled={geoBusy}
            className="h-7 px-2 text-xs"
          >
            <Crosshair className="size-3" />
            {geoBusy ? "Locating…" : "Use my location"}
          </Button>
          {pin && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPin(null)}
              className="h-7 px-2 text-xs"
            >
              <X className="size-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click the map to drop a pin where the collector should visit. Drag the
        pin to fine-tune.
      </p>

      <div className="overflow-hidden rounded-md border">
        <MapInner
          center={pin ?? DEFAULT_CENTER}
          pin={pin}
          onChange={(latlng) => setPin(latlng)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {pin ? (
          <>
            <span className="font-mono">
              {pin[0].toFixed(6)}, {pin[1].toFixed(6)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${pin[0]},${pin[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Open in Google Maps
            </a>
          </>
        ) : (
          <span>No pin set.</span>
        )}
        {geoError && <span className="text-destructive">{geoError}</span>}
      </div>

      {/* Hidden inputs feed the form submission */}
      <input
        type="hidden"
        name="latitude"
        value={pin ? pin[0].toString() : ""}
      />
      <input
        type="hidden"
        name="longitude"
        value={pin ? pin[1].toString() : ""}
      />

      {errors?.latitude?.[0] && (
        <p className="text-xs text-destructive">{errors.latitude[0]}</p>
      )}
      {errors?.longitude?.[0] && (
        <p className="text-xs text-destructive">{errors.longitude[0]}</p>
      )}
    </div>
  );
}
