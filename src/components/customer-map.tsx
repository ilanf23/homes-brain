import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Card, Eyebrow, Pill } from "@/lib/ui";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker as MLMarker, StyleSpecification } from "maplibre-gl";

/* Customer map: MapLibre GL over free OSM raster tiles (no API key).
   The maplibre JS (~200KB) loads via dynamic import inside an effect, so it
   never runs during SSR and stays out of the main bundle. Pin colors follow
   status priority: coral owes money, amber due for service, ink unclaimed,
   indigo active. */

export type MapPinStatus = "owes" | "due" | "unclaimed" | "active";

export type MapPin = {
  homeId: string;
  customerId: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: MapPinStatus;
};

const STATUS_META: Record<
  MapPinStatus,
  { label: string; color: string; accent: "coral" | "amber" | "ink" | "indigo" }
> = {
  owes: { label: "Owes money", color: "var(--coral)", accent: "coral" },
  due: { label: "Due for service", color: "var(--amber)", accent: "amber" },
  unclaimed: { label: "Unclaimed", color: "var(--ink)", accent: "ink" },
  active: { label: "Active", color: "var(--indigo)", accent: "indigo" },
};

const FILTERS: (MapPinStatus | "all")[] = ["all", "owes", "due", "unclaimed", "active"];

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function CustomerMap({
  pins,
  geocodingCount = 0,
}: {
  pins: MapPin[];
  geocodingCount?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const [filter, setFilter] = useState<MapPinStatus | "all">("all");
  const [selected, setSelected] = useState<MapPin | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? pins : pins.filter((p) => p.status === filter)),
    [pins, filter],
  );

  const counts = useMemo(() => {
    const c: Record<MapPinStatus, number> = { owes: 0, due: 0, unclaimed: 0, active: 0 };
    for (const p of pins) c[p.status] += 1;
    return c;
  }, [pins]);

  useEffect(() => {
    if (!containerRef.current || visible.length === 0) return;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new maplibregl.Map({
          container: containerRef.current,
          style: OSM_STYLE,
          center: [visible[0].lng, visible[0].lat],
          zoom: 11,
          attributionControl: { compact: true },
        });
      }
      for (const m of markersRef.current) m.remove();
      markersRef.current = visible.map((p) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "hb-map-pin";
        el.style.background = STATUS_META[p.status].color;
        el.setAttribute("aria-label", `${p.name}, ${p.address}`);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(p);
        });
        return new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .addTo(mapRef.current!);
      });
      if (visible.length === 1) {
        mapRef.current.jumpTo({ center: [visible[0].lng, visible[0].lat], zoom: 13 });
      } else {
        const b = new maplibregl.LngLatBounds();
        for (const p of visible) b.extend([p.lng, p.lat]);
        mapRef.current.fitBounds(b, { padding: 48, maxZoom: 14, duration: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(
    () => () => {
      for (const m of markersRef.current) m.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return (
    <Card className="anim-fade-up d-4 mt-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Eyebrow accent="indigo">Your customers on the map</Eyebrow>
        {geocodingCount > 0 && (
          <span className="text-xs text-muted tnum">
            Placing {geocodingCount} {geocodingCount === 1 ? "home" : "homes"} on the map...
          </span>
        )}
      </div>

      {pins.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Your service area appears here as customers are added.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f;
              const label =
                f === "all" ? `All (${pins.length})` : `${STATUS_META[f].label} (${counts[f]})`;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setSelected(null);
                  }}
                  className={`pressable rounded-full px-3 py-1 text-xs font-semibold border transition-colors duration-150 ${
                    active
                      ? "bg-indigobg text-indigo border-indigo/40"
                      : "bg-paper text-muted border-line hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative mt-3">
            <div
              ref={containerRef}
              className="hb-map-canvas h-[300px] md:h-[380px] rounded-2xl overflow-hidden border border-line"
            />
            {visible.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-soft/70 text-sm text-muted">
                No customers match this filter.
              </div>
            )}
            {selected && (
              <div className="absolute left-3 bottom-3 z-10 max-w-[280px] rounded-2xl border border-line bg-paper p-3 shadow-lg anim-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">{selected.name}</div>
                    <div className="text-xs text-muted">{selected.address}</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setSelected(null)}
                    className="text-muted hover:text-ink shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Pill accent={STATUS_META[selected.status].accent}>
                    {STATUS_META[selected.status].label}
                  </Pill>
                  {selected.customerId && (
                    <Link
                      to="/pro/customers/$customerId"
                      params={{ customerId: selected.customerId }}
                      className="text-xs font-semibold text-indigo hover:underline"
                    >
                      Open customer →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
