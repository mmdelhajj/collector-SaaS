"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CollectorZone } from "@/lib/zones-types";
import { cn } from "@/lib/utils";
import {
  createZoneAction,
  deleteZoneAction,
  updateZoneAction,
} from "./actions";

const ZoneMap = dynamic(() => import("./zone-map").then((m) => m.ZoneMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-xl border bg-muted/20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

type DraftZone = {
  name: string;
  color: string;
  default_collector_id: number | null;
  polygon: Array<[number, number]>;
};

const EMPTY_DRAFT: DraftZone = {
  name: "",
  color: "#0ea5e9",
  default_collector_id: null,
  polygon: [],
};

export function ZonesEditor({
  initialZones,
  collectors,
}: {
  initialZones: CollectorZone[];
  collectors: Array<{ id: number; name: string }>;
}) {
  const [zones, setZones] = useState(initialZones);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(
    initialZones[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<DraftZone>(() => {
    const first = initialZones[0];
    return first
      ? {
          name: first.name,
          color: first.color,
          default_collector_id: first.default_collector?.id ?? null,
          polygon: first.polygon,
        }
      : EMPTY_DRAFT;
  });
  const [isPending, startTransition] = useTransition();
  const lastZonesRef = useRef(initialZones);

  useEffect(() => {
    lastZonesRef.current = zones;
  }, [zones]);

  const selectedZone = useMemo(
    () => (typeof selectedId === "number" ? zones.find((z) => z.id === selectedId) ?? null : null),
    [zones, selectedId],
  );

  function selectZone(id: number) {
    setSelectedId(id);
    const z = zones.find((x) => x.id === id);
    if (z) {
      setDraft({
        name: z.name,
        color: z.color,
        default_collector_id: z.default_collector?.id ?? null,
        polygon: z.polygon,
      });
    }
  }

  function startNew() {
    setSelectedId("new");
    setDraft({ ...EMPTY_DRAFT, name: "" });
  }

  function appendPoint(latlng: [number, number]) {
    setDraft((d) => ({ ...d, polygon: [...d.polygon, latlng] }));
  }

  function undoPoint() {
    setDraft((d) => ({ ...d, polygon: d.polygon.slice(0, -1) }));
  }

  function clearPoints() {
    setDraft((d) => ({ ...d, polygon: [] }));
  }

  function handleSave() {
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (draft.polygon.length < 3) {
      toast.error("Click at least 3 points on the map");
      return;
    }

    startTransition(async () => {
      if (selectedId === "new") {
        const res = await createZoneAction({
          name: draft.name.trim(),
          color: draft.color,
          polygon: draft.polygon,
          default_collector_id: draft.default_collector_id,
        });
        if (res.ok && res.id) {
          toast.success("Zone created");
          // refetch isn't trivial here without server roundtrip — nudge with revalidatePath
          window.location.reload();
        } else {
          toast.error(res.error ?? "Could not save");
        }
      } else if (typeof selectedId === "number") {
        const res = await updateZoneAction(selectedId, {
          name: draft.name.trim(),
          color: draft.color,
          polygon: draft.polygon,
          default_collector_id: draft.default_collector_id,
        });
        if (res.ok) {
          toast.success("Zone saved");
          setZones((prev) =>
            prev.map((z) =>
              z.id === selectedId
                ? {
                    ...z,
                    name: draft.name.trim(),
                    color: draft.color,
                    polygon: draft.polygon,
                    default_collector:
                      collectors.find((c) => c.id === draft.default_collector_id) ?? null,
                  }
                : z,
            ),
          );
        } else {
          toast.error(res.error ?? "Could not save");
        }
      }
    });
  }

  function handleDelete() {
    if (typeof selectedId !== "number") return;
    if (!confirm("Delete this zone?")) return;
    startTransition(async () => {
      const res = await deleteZoneAction(selectedId);
      if (res.ok) {
        toast.success("Zone deleted");
        setZones((prev) => prev.filter((z) => z.id !== selectedId));
        const next = zones.find((z) => z.id !== selectedId);
        if (next) {
          selectZone(next.id);
        } else {
          startNew();
        }
      } else {
        toast.error(res.error ?? "Could not delete");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        <Button type="button" onClick={startNew} className="w-full justify-start">
          <Plus className="size-4" />
          New zone
        </Button>
        <div className="space-y-1">
          {zones.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              No zones yet. Create your first one.
            </p>
          ) : (
            zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => selectZone(z.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
                  selectedId === z.id && "border-primary bg-primary/5",
                )}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: z.color }}
                />
                <span className="flex-1 truncate font-medium">{z.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {z.polygon.length} pts
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="z-name">Zone name</Label>
            <Input
              id="z-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Tripoli North"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="z-color"
                type="color"
                value={draft.color}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, color: e.target.value }))
                }
                className="h-9 w-14 cursor-pointer rounded-md border bg-transparent"
              />
              <code className="text-xs text-muted-foreground">{draft.color}</code>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-collector">Default collector</Label>
            <select
              id="z-collector"
              value={draft.default_collector_id ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  default_collector_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— None —</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <ZoneMap
            zones={zones.filter(
              (z) => typeof selectedId !== "number" || z.id !== selectedId,
            )}
            draftPolygon={draft.polygon}
            draftColor={draft.color}
            onAddPoint={appendPoint}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              Click on the map to add a vertex. {draft.polygon.length} point
              {draft.polygon.length === 1 ? "" : "s"} added.
            </p>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.polygon.length === 0}
                onClick={undoPoint}
              >
                <Undo2 className="size-3.5" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.polygon.length === 0}
                onClick={clearPoints}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          {typeof selectedId === "number" && (
            <Button
              type="button"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="size-4" />
              Delete zone
            </Button>
          )}
          <div className="ms-auto">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="ms-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {selectedId === "new" ? "Create zone" : "Save changes"}
                </>
              )}
            </Button>
          </div>
        </div>
        {selectedZone && draft.polygon !== selectedZone.polygon && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Unsaved changes to the polygon.
          </p>
        )}
      </div>
    </div>
  );
}
