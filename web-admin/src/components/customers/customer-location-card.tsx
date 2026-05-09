"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  Crosshair,
  Loader2,
  MapPin,
  Search,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  geocodeAddressAction,
  setCustomerLocationAction,
} from "@/app/(dashboard)/customers/actions";

const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018];

const MapInner = dynamic(() => import("./customer-location-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[260px] w-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function CustomerLocationCard({
  customerId,
  initialLat,
  initialLng,
  defaultSearch,
}: {
  customerId: string;
  initialLat: number | null;
  initialLng: number | null;
  /** Pre-filled "Find from address" input (e.g. "Hamra Street, Beirut"). */
  defaultSearch?: string;
}) {
  const initial = useMemo<[number, number] | null>(() => {
    if (
      typeof initialLat === "number" &&
      typeof initialLng === "number" &&
      Number.isFinite(initialLat) &&
      Number.isFinite(initialLng)
    ) {
      return [initialLat, initialLng];
    }
    return null;
  }, [initialLat, initialLng]);

  const [savedPin, setSavedPin] = useState<[number, number] | null>(initial);
  const [pin, setPin] = useState<[number, number] | null>(initial);
  const [search, setSearch] = useState(defaultSearch ?? "");
  const [geoBusy, setGeoBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  // If the page reloads with new server data, re-baseline.
  useEffect(() => {
    setSavedPin(initial);
    setPin(initial);
  }, [initial]);

  const dirty =
    (pin?.[0] ?? null) !== (savedPin?.[0] ?? null) ||
    (pin?.[1] ?? null) !== (savedPin?.[1] ?? null);

  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    setGeoBusy(true);
    setError(null);
    setInfo(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin([pos.coords.latitude, pos.coords.longitude]);
        setInfo("Pin set to your current location. Press Save to keep it.");
        setGeoBusy(false);
      },
      (err) => {
        setError(err.message || "Could not get your location.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function handleSearch() {
    const q = search.trim();
    if (q.length < 3) {
      setError("Type at least 3 characters.");
      return;
    }
    setSearchBusy(true);
    setError(null);
    setInfo(null);
    const res = await geocodeAddressAction(q);
    setSearchBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPin([res.latitude, res.longitude]);
    setInfo(`Match: ${res.display_name}. Adjust if needed, then Save.`);
  }

  function handleSave() {
    setError(null);
    setInfo(null);
    startSave(async () => {
      const res = await setCustomerLocationAction(
        customerId,
        pin ? pin[0] : null,
        pin ? pin[1] : null,
      );
      if (res.ok) {
        toast.success(pin ? "Location saved" : "Location cleared");
        setSavedPin(pin);
      } else {
        toast.error(res.error ?? "Could not save location.");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-semibold">
            <MapPin className="size-4" />
            Location pin
          </h2>
          <p className="text-xs text-muted-foreground">
            Where the collector should physically visit. Used for routing and
            the GPS proximity check.
          </p>
        </div>
        {savedPin && (
          <a
            href={`https://www.google.com/maps?q=${savedPin[0]},${savedPin[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Open in Google Maps
          </a>
        )}
      </div>

      <div className="space-y-3 p-5">
        {/* Search by address (Nominatim) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-1.5 rounded-md border bg-background px-2.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Find from address (e.g. Hamra Street, Beirut)"
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={searchBusy}
            >
              {searchBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              Find
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseMyLocation}
              disabled={geoBusy}
            >
              {geoBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Crosshair className="size-3.5" />
              )}
              Use my location
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="overflow-hidden rounded-md border">
          <MapInner
            center={pin ?? savedPin ?? DEFAULT_CENTER}
            pin={pin}
            onChange={(latlng) => {
              setPin(latlng);
              setInfo("Pin moved. Press Save to keep it.");
            }}
          />
        </div>

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {pin ? (
            <span className="font-mono text-muted-foreground">
              {pin[0].toFixed(6)}, {pin[1].toFixed(6)}
            </span>
          ) : (
            <span className="text-muted-foreground">No pin set.</span>
          )}
          {info && <span className="text-muted-foreground">{info}</span>}
          {error && <span className="text-destructive">{error}</span>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          {pin && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPin(null);
                setInfo(savedPin ? "Pin removed. Press Save to clear." : null);
              }}
              disabled={isSaving}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
