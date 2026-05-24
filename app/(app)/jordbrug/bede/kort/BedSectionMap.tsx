"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  generateSectionGeoJSON,
  generateSectionOutline,
  type SectionConfig,
} from "@/lib/bedGeometry";
import { RotateCcw, RotateCw, Check, X, ChevronLeft, Rows3, MapPin } from "lucide-react";
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

const SECTION_COLORS = [
  "#c2410c", "#15803d", "#1d4ed8", "#7e22ce",
  "#b45309", "#0e7490", "#be185d", "#4d7c0f",
];

export default function BedSectionMap({
  farmId,
  farmLat,
  farmLng,
  sections,
  mapboxToken,
}: {
  farmId: string;
  farmLat: number;
  farmLng: number;
  sections: StoredSection[];
  mapboxToken: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"overview" | "placing">("overview");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Den sektion vi er ved at placere
  const [activeSection, setActiveSection] = useState<StoredSection | null>(null);
  const [rotation, setRotation] = useState(0);

  const modeRef = useRef(mode);
  const rotationRef = useRef(rotation);
  const activeSectionRef = useRef(activeSection);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { rotationRef.current = rotation; updateGhost(); }, [rotation]);
  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);

  function getCfg(lat: number, lng: number, section: StoredSection): SectionConfig {
    return {
      centerLat: lat,
      centerLng: lng,
      bedCount: section.bed_count ?? 1,
      bedLengthM: section.bed_length_m ?? 10,
      bedWidthM: section.bed_width_m ?? 0.75,
      pathWidthM: section.bed_width_m ?? 0.4,
      rotationDeg: rotationRef.current,
    };
  }

  function updateGhost() {
    const map = mapRef.current;
    const section = activeSectionRef.current;
    if (!map || modeRef.current !== "placing" || !section) return;
    const { lat, lng } = map.getCenter();
    const cfg = getCfg(lat, lng, section);
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
        // Render placerede sektioner
        sections.forEach((s, idx) => {
          if (!s.center_lat || !s.center_lng || !s.bed_count) return;
          const cfg: SectionConfig = {
            centerLat: s.center_lat,
            centerLng: s.center_lng,
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
            type: "Feature",
            geometry: { type: "Point", coordinates: [s.center_lng, s.center_lat] },
            properties: { name: s.name },
          }});
          map.addLayer({ id: `${sid}-label-l`, type: "symbol", source: `${sid}-label`,
            layout: {
              "text-field": ["get", "name"], "text-size": 12,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            },
            paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,0.6)", "text-halo-width": 1.5 },
          });
        });

        // Ghost-lag (tomt ved start)
        map.addSource("ghost-fill", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("ghost-outline", { type: "geojson", data: {
          type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[]] },
        }});
        map.addLayer({ id: "ghost-outline-l", type: "line", source: "ghost-outline",
          paint: { "line-color": "#f97316", "line-width": 2.5, "line-dasharray": [3, 1.5] } });
        map.addLayer({ id: "ghost-fill-l", type: "fill", source: "ghost-fill",
          paint: { "fill-color": "#f97316", "fill-opacity": 0.45 } });

        map.on("move", () => {
          if (modeRef.current !== "placing" || !activeSectionRef.current) return;
          const { lat, lng } = map.getCenter();
          const cfg = getCfg(lat, lng, activeSectionRef.current);
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

  const PANEL_PADDING = 160; // højde af placement-panel + margin

  function startPlacement(section: StoredSection) {
    setActiveSection(section);
    activeSectionRef.current = section;
    setRotation(section.orientation_degrees ?? 0);
    rotationRef.current = section.orientation_degrees ?? 0;
    setMode("placing");
    modeRef.current = "placing";

    const map = mapRef.current;
    if (!map) return;
    // Skub kortets effektive centrum op over panelet
    map.setPadding({ top: 0, bottom: PANEL_PADDING, left: 0, right: 0 }, { duration: 300 });
    const { lat, lng } = map.getCenter();
    const cfg = getCfg(lat, lng, section);
    map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg));
    map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg));
  }

  function cancelPlacement() {
    setMode("overview");
    modeRef.current = "overview";
    setActiveSection(null);
    activeSectionRef.current = null;
    const map = mapRef.current;
    if (!map) return;
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }, { duration: 300 });
    map.getSource("ghost-fill")?.setData({ type: "FeatureCollection", features: [] });
    map.getSource("ghost-outline")?.setData({
      type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[]] },
    });
  }

  async function confirmPlacement() {
    if (!activeSection || !mapRef.current) return;
    setSaving(true);
    const { lat, lng } = mapRef.current.getCenter();

    // Opdatér sektion med kortkoordinater og orientering
    await supabase.from("bed_sections").update({
      center_lat: lat,
      center_lng: lng,
      orientation_degrees: rotation,
    }).eq("id", activeSection.id);

    // Opret bede hvis de ikke allerede eksisterer
    if (activeSection.beds.length === 0) {
      const bedCount = activeSection.bed_count ?? 1;
      const beds = Array.from({ length: bedCount }, (_, i) => ({
        farm_id: farmId,
        section_id: activeSection.id,
        name: `${activeSection.name} — Bed ${i + 1}`,
        length_m: activeSection.bed_length_m,
        width_m: activeSection.bed_width_m,
        orientation_degrees: rotation,
        status: "aktiv",
      }));
      await supabase.from("beds").insert(beds);
    }

    setSaving(false);
    router.refresh();
    cancelPlacement();
  }

  const placed = sections.filter(s => s.center_lat);
  const unplaced = sections.filter(s => !s.center_lat);

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
      {loaded && mode === "overview" && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-xl text-xs shadow-lg whitespace-nowrap"
          style={{ background: "rgba(21,26,16,0.9)", color: "var(--text-muted)", backdropFilter: "blur(8px)" }}
        >
          {placed.length} placeret · {unplaced.length} mangler placering
        </div>
      )}

      {/* Crosshair */}
      {mode === "placing" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-8 h-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-80" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white opacity-80" />
            <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-orange-400" />
          </div>
        </div>
      )}

      {/* Uplacerede sektioner */}
      {loaded && mode === "overview" && unplaced.length > 0 && (
        <div
          className="absolute bottom-4 left-3 right-3 z-10 rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(21,26,16,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-earth-400">
            Klar til placering
          </p>
          {unplaced.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Rows3 size={14} className="text-earth-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-earth-100 truncate">{s.name}</p>
                  <p className="text-[10px] text-earth-500">
                    {s.bed_count} bede · {s.bed_length_m}×{s.bed_width_m} m
                  </p>
                </div>
              </div>
              <button
                onClick={() => startPlacement(s)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
                style={{ background: "var(--clay)", color: "#fff" }}
              >
                <MapPin size={14} />
                Placer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Placement-panel — kompakt bundbjælke */}
      {mode === "placing" && activeSection && (
        <div
          className="absolute left-2 right-2 z-20 rounded-2xl px-3 py-2.5"
          style={{
            bottom: "5.5rem",
            background: "rgba(21,26,16,0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center gap-2">
            {/* Navn + info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-earth-100 truncate">{activeSection.name}</p>
              <p className="text-[10px] text-earth-500">
                {activeSection.bed_count} bede · {rotation}°{" "}
                <span className="text-earth-600">
                  {rotation === 0 || rotation === 180 ? "N–S" :
                   rotation === 90 || rotation === 270 ? "Ø–V" :
                   (rotation > 0 && rotation < 90) || (rotation > 180 && rotation < 270) ? "NØ–SV" : "SØ–NV"}
                </span>
              </p>
            </div>

            {/* Rotation */}
            <button
              type="button"
              onClick={() => setRotation(r => (r - 15 + 360) % 360)}
              className="p-2 rounded-lg flex-shrink-0"
              style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setRotation(r => (r + 15) % 360)}
              className="p-2 rounded-lg flex-shrink-0"
              style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
            >
              <RotateCw size={15} />
            </button>

            {/* Bekræft */}
            <button
              onClick={confirmPlacement}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 disabled:opacity-40"
              style={{ background: "var(--clay)", color: "#fff" }}
            >
              <Check size={15} />
              {saving ? "…" : "Placer"}
            </button>

            {/* Annuller */}
            <button
              onClick={cancelPlacement}
              className="p-2 rounded-lg flex-shrink-0"
              style={{ color: "var(--text-subtle)" }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
