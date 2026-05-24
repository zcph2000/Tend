"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  generateSectionGeoJSON,
  generateSectionOutline,
  type SectionConfig,
} from "@/lib/bedGeometry";
import { RotateCcw, RotateCw, Check, X, ChevronLeft, Rows3, Square, MapPin } from "lucide-react";
import Link from "next/link";

type StoredSection = {
  id: string;
  name: string;
  center_lat: number | null;
  center_lng: number | null;
  orientation_degrees: number | null;
  bed_count: number | null;
  bed_length_m: number | null;
  bed_width_m: number | null;
  path_width_m: number | null;
  beds: { id: string; name: string }[];
};

type StoredBed = {
  id: string;
  name: string;
  center_lat: number | null;
  center_lng: number | null;
  orientation_degrees: number | null;
  length_m: number | null;
  width_m: number | null;
};

type StoredField = {
  id: string;
  name: string;
  area_ha: number | null;
  geojson: { type: string; coordinates: number[][][] } | null;
};

type PlacingItem =
  | { type: "section"; data: StoredSection }
  | { type: "bed"; data: StoredBed };

const SECTION_COLORS = [
  "#c2410c", "#15803d", "#1d4ed8", "#7e22ce",
  "#b45309", "#0e7490", "#be185d", "#4d7c0f",
];

export default function BedSectionMap({
  farmId,
  farmLat,
  farmLng,
  sections,
  beds,
  fields,
  mapboxToken,
}: {
  farmId: string;
  farmLat: number;
  farmLng: number;
  sections: StoredSection[];
  beds: StoredBed[];
  fields: StoredField[];
  mapboxToken: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [rotation, setRotation] = useState(0);
  const [activeItem, setActiveItem] = useState<PlacingItem | null>(null);

  const placingRef = useRef(false);
  const rotationRef = useRef(0);
  const activeItemRef = useRef<PlacingItem | null>(null);

  useEffect(() => { placingRef.current = placing; }, [placing]);
  useEffect(() => { rotationRef.current = rotation; updateGhost(); }, [rotation]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { activeItemRef.current = activeItem; }, [activeItem]);

  function cfgFor(lat: number, lng: number, item: PlacingItem): SectionConfig {
    if (item.type === "section") {
      return {
        centerLat: lat, centerLng: lng,
        bedCount: item.data.bed_count ?? 1,
        bedLengthM: item.data.bed_length_m ?? 10,
        bedWidthM: item.data.bed_width_m ?? 0.75,
        pathWidthM: item.data.path_width_m ?? 0.4,
        rotationDeg: rotationRef.current,
      };
    }
    return {
      centerLat: lat, centerLng: lng,
      bedCount: 1,
      bedLengthM: item.data.length_m ?? 3,
      bedWidthM: item.data.width_m ?? 1,
      pathWidthM: 0,
      rotationDeg: rotationRef.current,
    };
  }

  function updateGhost() {
    const map = mapRef.current;
    const item = activeItemRef.current;
    if (!map || !placingRef.current || !item) return;
    const { lat, lng } = map.getCenter();
    const cfg = cfgFor(lat, lng, item);
    map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg));
    map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg));
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = mapboxToken;

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [farmLng, farmLat],
        zoom: 16,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

      map.on("load", () => {
        // Marker som grønne polygoner i baggrunden
        fields.forEach((f) => {
          if (!f.geojson) return;
          const fid = `field-${f.id}`;
          const feature = { type: "Feature" as const, properties: { name: f.name }, geometry: f.geojson };
          map.addSource(fid, { type: "geojson", data: feature });
          map.addLayer({ id: `${fid}-fill`, type: "fill", source: fid,
            paint: { "fill-color": "#15803d", "fill-opacity": 0.18 } });
          map.addLayer({ id: `${fid}-outline`, type: "line", source: fid,
            paint: { "line-color": "#4ade80", "line-width": 1.5, "line-dasharray": [4, 2] } });
          const coords = f.geojson.coordinates[0];
          const centroid = coords.reduce(
            (acc, c) => [acc[0] + c[0] / coords.length, acc[1] + c[1] / coords.length], [0, 0]
          );
          map.addSource(`${fid}-label`, { type: "geojson", data: {
            type: "Feature", properties: { name: f.name },
            geometry: { type: "Point", coordinates: centroid },
          }});
          map.addLayer({ id: `${fid}-label-l`, type: "symbol", source: `${fid}-label`,
            layout: { "text-field": ["get", "name"], "text-size": 11,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"] },
            paint: { "text-color": "#4ade80", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.5 },
          });
        });

        // Placerede sektioner
        sections.forEach((s, idx) => {
          if (!s.center_lat || !s.center_lng || !s.bed_count) return;
          const cfg: SectionConfig = {
            centerLat: s.center_lat, centerLng: s.center_lng,
            bedCount: s.bed_count,
            bedLengthM: s.bed_length_m ?? 10,
            bedWidthM: s.bed_width_m ?? 0.75,
            pathWidthM: s.path_width_m ?? 0.4,
            rotationDeg: s.orientation_degrees ?? 0,
          };
          const color = SECTION_COLORS[idx % SECTION_COLORS.length];
          const sid = `section-${s.id}`;
          map.addSource(`${sid}-fill`, { type: "geojson", data: generateSectionGeoJSON(cfg) });
          map.addSource(`${sid}-outline`, { type: "geojson", data: generateSectionOutline(cfg) });
          map.addLayer({ id: `${sid}-outline-l`, type: "line", source: `${sid}-outline`,
            paint: { "line-color": color, "line-width": 2 } });
          map.addLayer({ id: `${sid}-fill-l`, type: "fill", source: `${sid}-fill`,
            paint: { "fill-color": color, "fill-opacity": 0.45 } });
          map.addSource(`${sid}-label`, { type: "geojson", data: {
            type: "Feature", geometry: { type: "Point", coordinates: [s.center_lng, s.center_lat] },
            properties: { name: s.name },
          }});
          map.addLayer({ id: `${sid}-label-l`, type: "symbol", source: `${sid}-label`,
            layout: { "text-field": ["get", "name"], "text-size": 12,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"] },
            paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,0.6)", "text-halo-width": 1.5 },
          });
        });

        // Placerede enkelt bede (amber)
        beds.filter(b => b.center_lat && b.center_lng).forEach((b) => {
          const cfg: SectionConfig = {
            centerLat: b.center_lat!, centerLng: b.center_lng!,
            bedCount: 1,
            bedLengthM: b.length_m ?? 3,
            bedWidthM: b.width_m ?? 1,
            pathWidthM: 0,
            rotationDeg: b.orientation_degrees ?? 0,
          };
          const bid = `bed-${b.id}`;
          map.addSource(`${bid}-fill`, { type: "geojson", data: generateSectionGeoJSON(cfg) });
          map.addSource(`${bid}-outline`, { type: "geojson", data: generateSectionOutline(cfg) });
          map.addLayer({ id: `${bid}-outline-l`, type: "line", source: `${bid}-outline`,
            paint: { "line-color": "#fbbf24", "line-width": 1.5 } });
          map.addLayer({ id: `${bid}-fill-l`, type: "fill", source: `${bid}-fill`,
            paint: { "fill-color": "#fbbf24", "fill-opacity": 0.4 } });
          map.addSource(`${bid}-label`, { type: "geojson", data: {
            type: "Feature", geometry: { type: "Point", coordinates: [b.center_lng!, b.center_lat!] },
            properties: { name: b.name },
          }});
          map.addLayer({ id: `${bid}-label-l`, type: "symbol", source: `${bid}-label`,
            layout: { "text-field": ["get", "name"], "text-size": 11,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"] },
            paint: { "text-color": "#fbbf24", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.5 },
          });
        });

        // Ghost-lag
        map.addSource("ghost-fill", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("ghost-outline", { type: "geojson", data: {
          type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[]] },
        }});
        map.addLayer({ id: "ghost-outline-l", type: "line", source: "ghost-outline",
          paint: { "line-color": "#f97316", "line-width": 2.5, "line-dasharray": [3, 1.5] } });
        map.addLayer({ id: "ghost-fill-l", type: "fill", source: "ghost-fill",
          paint: { "fill-color": "#f97316", "fill-opacity": 0.45 } });

        map.on("move", () => {
          if (!placingRef.current || !activeItemRef.current) return;
          const { lat, lng } = map.getCenter();
          const cfg = cfgFor(lat, lng, activeItemRef.current);
          map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg));
          map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg));
        });

        mapRef.current = map;
        setLoaded(true);
      });
    }

    initMap();
    return () => { if (map) map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const PANEL_PADDING = 210;

  function startPlacement(item: PlacingItem) {
    const initRot = item.type === "section"
      ? (item.data.orientation_degrees ?? 0)
      : (item.data.orientation_degrees ?? 0);
    setActiveItem(item);
    activeItemRef.current = item;
    setRotation(initRot);
    rotationRef.current = initRot;
    setPlacing(true);
    placingRef.current = true;

    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ padding: { top: 0, bottom: PANEL_PADDING, left: 0, right: 0 }, duration: 300 });
    const { lat, lng } = map.getCenter();
    const cfg = cfgFor(lat, lng, item);
    map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg));
    map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg));
    requestAnimationFrame(() => {
      const { lat: lat2, lng: lng2 } = map.getCenter();
      const cfg2 = cfgFor(lat2, lng2, item);
      map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg2));
      map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg2));
    });
  }

  function cancelPlacement() {
    setPlacing(false);
    placingRef.current = false;
    setActiveItem(null);
    activeItemRef.current = null;
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 300 });
    map.getSource("ghost-fill")?.setData({ type: "FeatureCollection", features: [] });
    map.getSource("ghost-outline")?.setData({
      type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[]] },
    });
  }

  async function confirmPlacement() {
    if (!activeItem || !mapRef.current) return;
    setSaving(true);
    const { lat, lng } = mapRef.current.getCenter();

    if (activeItem.type === "section") {
      const s = activeItem.data;
      await supabase.from("bed_sections").update({
        center_lat: lat, center_lng: lng, orientation_degrees: rotation,
      }).eq("id", s.id);

      if (s.beds.length === 0) {
        const bedCount = s.bed_count ?? 1;
        await supabase.from("beds").insert(
          Array.from({ length: bedCount }, (_, i) => ({
            farm_id: farmId,
            section_id: s.id,
            name: `${s.name} — Bed ${i + 1}`,
            length_m: s.bed_length_m,
            width_m: s.bed_width_m,
            orientation_degrees: rotation,
            status: "aktiv",
          }))
        );
      }
    } else {
      await supabase.from("beds").update({
        center_lat: lat, center_lng: lng, orientation_degrees: rotation,
      }).eq("id", activeItem.data.id);
    }

    setSaving(false);
    router.refresh();
    cancelPlacement();
  }

  const unplacedSections = sections.filter(s => !s.center_lat);
  const unplacedBeds = beds.filter(b => !b.center_lat);
  const hasUnplaced = unplacedSections.length > 0 || unplacedBeds.length > 0;

  return (
    <div className="relative" style={{ height: "calc(100dvh - 8rem)" }}>
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Tilbage */}
      <Link
        href="/jordbrug/bede"
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shadow-lg"
        style={{ background: "rgba(21,26,16,0.9)", color: "var(--text-muted)", backdropFilter: "blur(8px)" }}
      >
        <ChevronLeft size={15} />
        Bede
      </Link>

      {/* Stats */}
      {loaded && !placing && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-xl text-xs shadow-lg flex items-center gap-2 whitespace-nowrap"
          style={{ background: "rgba(21,26,16,0.9)", color: "var(--text-muted)", backdropFilter: "blur(8px)" }}
        >
          <span style={{ color: "#4ade80" }}>■</span>
          {fields.length} {fields.length === 1 ? "mark" : "marker"}
          <span className="opacity-30">·</span>
          {sections.filter(s => s.center_lat).length + beds.filter(b => b.center_lat).length} placerede bede
          {hasUnplaced && <span className="opacity-60">({unplacedSections.length + unplacedBeds.length} mangler)</span>}
        </div>
      )}

      {/* Crosshair */}
      {placing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-8 h-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-80" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white opacity-80" />
            <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-orange-400" />
          </div>
        </div>
      )}

      {/* Uplacerede ting */}
      {loaded && !placing && hasUnplaced && (
        <div
          className="absolute bottom-4 left-3 right-3 z-10 rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(21,26,16,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-earth-400">Klar til placering</p>

          {unplacedSections.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Rows3 size={14} className="text-earth-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-earth-100 truncate">{s.name}</p>
                  <p className="text-[10px] text-earth-500">{s.bed_count} bede · {s.bed_length_m}×{s.bed_width_m} m</p>
                </div>
              </div>
              <button
                onClick={() => startPlacement({ type: "section", data: s })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                style={{ background: "var(--clay)", color: "#fff" }}
              >
                <MapPin size={14} />Placer
              </button>
            </div>
          ))}

          {unplacedBeds.map(b => (
            <div key={b.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Square size={14} className="text-earth-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-earth-100 truncate">{b.name}</p>
                  <p className="text-[10px] text-earth-500">
                    {b.length_m && b.width_m ? `${b.length_m}×${b.width_m} m` : "Enkelt bed"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => startPlacement({ type: "bed", data: b })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                style={{ background: "var(--clay)", color: "#fff" }}
              >
                <MapPin size={14} />Placer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Placement-panel */}
      {placing && activeItem && (
        <div
          className="absolute left-2 right-2 z-20 rounded-2xl px-3 py-2.5"
          style={{ bottom: "5.5rem", background: "rgba(21,26,16,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-earth-100 truncate">
                {activeItem.data.name}
              </p>
              <p className="text-[10px] text-earth-500">
                {activeItem.type === "section"
                  ? `${activeItem.data.bed_count} bede`
                  : "Enkelt bed"}
              </p>
            </div>
            <button
              onClick={confirmPlacement}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 disabled:opacity-40"
              style={{ background: "var(--clay)", color: "#fff" }}
            >
              <Check size={15} />
              {saving ? "…" : "Placer"}
            </button>
            <button onClick={cancelPlacement} className="p-2 rounded-lg flex-shrink-0" style={{ color: "var(--text-subtle)" }}>
              <X size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <button type="button" onClick={() => setRotation(r => (r - 15 + 360) % 360)}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs flex-shrink-0"
              style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
              <RotateCcw size={12} />15°
            </button>
            <button type="button" onClick={() => setRotation(r => (r - 1 + 360) % 360)}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs flex-shrink-0"
              style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
              <RotateCcw size={12} />1°
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-earth-100">{rotation}°</p>
              <p className="text-[10px] text-earth-600">
                {rotation === 0 || rotation === 180 ? "N–S" :
                 rotation === 90 || rotation === 270 ? "Ø–V" :
                 (rotation > 0 && rotation < 90) || (rotation > 180 && rotation < 270) ? "NØ–SV" : "SØ–NV"}
              </p>
            </div>
            <button type="button" onClick={() => setRotation(r => (r + 1) % 360)}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs flex-shrink-0"
              style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
              1°<RotateCw size={12} />
            </button>
            <button type="button" onClick={() => setRotation(r => (r + 15) % 360)}
              className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs flex-shrink-0"
              style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
              15°<RotateCw size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
