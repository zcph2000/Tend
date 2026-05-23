"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  generateSectionGeoJSON,
  generateSectionOutline,
  sectionDimensions,
  type SectionConfig,
} from "@/lib/bedGeometry";
import { Plus, RotateCcw, RotateCw, Check, X, ChevronLeft, Rows3 } from "lucide-react";
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
  "#c2410c", "#15803d", "#1d4ed8", "#7e22ce", "#b45309",
  "#0e7490", "#be185d", "#4d7c0f",
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

  // Placement config
  const [sectionName, setSectionName] = useState("");
  const [bedCount, setBedCount] = useState(6);
  const [bedLengthM, setBedLengthM] = useState(10);
  const [bedWidthM, setBedWidthM] = useState(0.75);
  const [pathWidthM, setPathWidthM] = useState(0.4);
  const [rotation, setRotation] = useState(0);

  // Refs for use in map event callbacks
  const modeRef = useRef(mode);
  const bedCountRef = useRef(bedCount);
  const bedLengthRef = useRef(bedLengthM);
  const bedWidthRef = useRef(bedWidthM);
  const pathWidthRef = useRef(pathWidthM);
  const rotationRef = useRef(rotation);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { bedCountRef.current = bedCount; updateGhost(); }, [bedCount]);
  useEffect(() => { bedLengthRef.current = bedLengthM; updateGhost(); }, [bedLengthM]);
  useEffect(() => { bedWidthRef.current = bedWidthM; updateGhost(); }, [bedWidthM]);
  useEffect(() => { pathWidthRef.current = pathWidthM; updateGhost(); }, [pathWidthM]);
  useEffect(() => { rotationRef.current = rotation; updateGhost(); }, [rotation]);

  function getCfg(lat: number, lng: number): SectionConfig {
    return {
      centerLat: lat,
      centerLng: lng,
      bedCount: bedCountRef.current,
      bedLengthM: bedLengthRef.current,
      bedWidthM: bedWidthRef.current,
      pathWidthM: pathWidthRef.current,
      rotationDeg: rotationRef.current,
    };
  }

  function updateGhost() {
    const map = mapRef.current;
    if (!map || modeRef.current !== "placing") return;
    const { lat, lng } = map.getCenter();
    const cfg = getCfg(lat, lng);
    map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg));
    map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg));
  }

  // Initialiser kort
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
        // Render eksisterende sektioner
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
          const sourceId = `section-${s.id}`;

          map.addSource(`${sourceId}-fill`, {
            type: "geojson",
            data: generateSectionGeoJSON(cfg),
          });
          map.addSource(`${sourceId}-outline`, {
            type: "geojson",
            data: generateSectionOutline(cfg),
          });
          map.addLayer({
            id: `${sourceId}-outline-layer`,
            type: "line",
            source: `${sourceId}-outline`,
            paint: { "line-color": color, "line-width": 2 },
          });
          map.addLayer({
            id: `${sourceId}-fill-layer`,
            type: "fill",
            source: `${sourceId}-fill`,
            paint: { "fill-color": color, "fill-opacity": 0.45 },
          });

          // Label i midten
          map.addSource(`${sourceId}-label`, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "Point", coordinates: [s.center_lng, s.center_lat] },
              properties: { name: s.name },
            },
          });
          map.addLayer({
            id: `${sourceId}-label-layer`,
            type: "symbol",
            source: `${sourceId}-label`,
            layout: {
              "text-field": ["get", "name"],
              "text-size": 12,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-anchor": "center",
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "rgba(0,0,0,0.6)",
              "text-halo-width": 1.5,
            },
          });
        });

        // Ghost-lag til placement (tomt ved start)
        map.addSource("ghost-fill", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addSource("ghost-outline", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[]] } },
        });
        map.addLayer({
          id: "ghost-outline-layer",
          type: "line",
          source: "ghost-outline",
          paint: { "line-color": "#f97316", "line-width": 2, "line-dasharray": [3, 1.5] },
        });
        map.addLayer({
          id: "ghost-fill-layer",
          type: "fill",
          source: "ghost-fill",
          paint: { "fill-color": "#f97316", "fill-opacity": 0.45 },
        });

        // Opdatér ghost-blok mens kortet flyttes
        map.on("move", () => {
          if (modeRef.current !== "placing") return;
          const { lat, lng } = map.getCenter();
          const cfg = getCfg(lat, lng);
          map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg));
          map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg));
        });

        mapRef.current = map;
        setLoaded(true);
      });
    }

    initMap();
    return () => {
      if (map) map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterPlacementMode() {
    setMode("placing");
    modeRef.current = "placing";
    // Vis ghost-blok med det samme
    const map = mapRef.current;
    if (!map) return;
    const { lat, lng } = map.getCenter();
    const cfg = getCfg(lat, lng);
    map.getSource("ghost-fill")?.setData(generateSectionGeoJSON(cfg));
    map.getSource("ghost-outline")?.setData(generateSectionOutline(cfg));
  }

  function cancelPlacement() {
    setMode("overview");
    modeRef.current = "overview";
    mapRef.current?.getSource("ghost-fill")?.setData({ type: "FeatureCollection", features: [] });
    mapRef.current?.getSource("ghost-outline")?.setData({
      type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[]] },
    });
  }

  async function saveSection() {
    if (!sectionName.trim() || !mapRef.current) return;
    setSaving(true);
    const { lat, lng } = mapRef.current.getCenter();

    // Opret sektion
    const { data: section } = await supabase.from("bed_sections").insert({
      farm_id: farmId,
      name: sectionName.trim(),
      center_lat: lat,
      center_lng: lng,
      orientation_degrees: rotation,
      bed_count: bedCount,
      bed_length_m: bedLengthM,
      bed_width_m: bedWidthM,
      path_width_m: pathWidthM,
    }).select("id").single();

    if (section) {
      // Auto-opret bede
      const beds = Array.from({ length: bedCount }, (_, i) => ({
        farm_id: farmId,
        section_id: section.id,
        name: `${sectionName} — Bed ${i + 1}`,
        length_m: bedLengthM,
        width_m: bedWidthM,
        orientation_degrees: rotation,
        status: "aktiv",
      }));
      await supabase.from("beds").insert(beds);
    }

    setSaving(false);
    router.refresh();
    cancelPlacement();
    setSectionName("");
  }

  const dims = sectionDimensions({ bedCount, bedLengthM, bedWidthM, pathWidthM });
  const placedCount = sections.filter(s => s.center_lat).length;
  const unplacedCount = sections.filter(s => !s.center_lat).length;

  return (
    <div className="relative" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* Kort */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Tilbage-knap */}
      <Link
        href="/jordbrug/bede"
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shadow-lg"
        style={{ background: "rgba(21,26,16,0.9)", color: "var(--text-muted)", backdropFilter: "blur(8px)" }}
      >
        <ChevronLeft size={15} />
        Bede
      </Link>

      {/* Stats-badge øverst */}
      {loaded && mode === "overview" && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-xl text-xs shadow-lg"
          style={{ background: "rgba(21,26,16,0.9)", color: "var(--text-muted)", backdropFilter: "blur(8px)" }}
        >
          {placedCount} sektioner på kortet
          {unplacedCount > 0 && ` · ${unplacedCount} ikke placeret`}
        </div>
      )}

      {/* Crosshair i placement-mode */}
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
      {loaded && mode === "overview" && unplacedCount > 0 && (
        <div
          className="absolute bottom-24 left-3 right-3 z-10 rounded-xl p-3 space-y-1"
          style={{ background: "rgba(21,26,16,0.92)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p className="text-xs text-earth-400 mb-2">Sektioner uden placering</p>
          {sections.filter(s => !s.center_lat).map(s => (
            <div key={s.id} className="flex items-center justify-between">
              <span className="text-sm text-earth-200 flex items-center gap-2">
                <Rows3 size={12} className="text-earth-500" />{s.name}
              </span>
              <button
                onClick={() => {
                  setSectionName(s.name);
                  if (s.bed_count) setBedCount(s.bed_count);
                  if (s.bed_length_m) setBedLengthM(s.bed_length_m);
                  if (s.bed_width_m) setBedWidthM(s.bed_width_m);
                  if (s.path_width_m) setPathWidthM(s.path_width_m);
                  if (s.orientation_degrees) setRotation(s.orientation_degrees);
                  enterPlacementMode();
                }}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: "var(--clay)", color: "#fff" }}
              >
                Placer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* + Ny sektion knap */}
      {loaded && mode === "overview" && (
        <button
          onClick={() => {
            setSectionName("");
            setBedCount(6);
            setBedLengthM(10);
            setBedWidthM(0.75);
            setPathWidthM(0.4);
            setRotation(0);
            enterPlacementMode();
          }}
          className="absolute bottom-6 right-4 z-10 flex items-center gap-2 px-4 py-3 rounded-xl font-medium shadow-lg"
          style={{ background: "var(--clay)", color: "#fff" }}
        >
          <Plus size={18} />
          Ny sektion
        </button>
      )}

      {/* Placement-panel */}
      {mode === "placing" && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl p-4 space-y-4"
          style={{
            background: "rgba(21,26,16,0.97)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            maxHeight: "55vh",
            overflowY: "auto",
          }}
        >
          {/* Instruktion */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-earth-400">
              Pan kortet for at placere — blokkens centrum er krydshåret
            </p>
            <button onClick={cancelPlacement}>
              <X size={16} className="text-earth-500" />
            </button>
          </div>

          {/* Sektionsnavn */}
          <div>
            <label className="label">Sektionsnavn</label>
            <input
              className="input w-full mt-1"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="fx Havesektionen, Nordbed, Polytunnel 1"
            />
          </div>

          {/* Bede-konfiguration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-[11px]">Antal bede</label>
              <input
                type="number" min="1" max="30"
                className="input w-full mt-1"
                value={bedCount}
                onChange={(e) => setBedCount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-[11px]">Bedelængde (m)</label>
              <input
                type="number" step="0.5" min="0.5"
                className="input w-full mt-1"
                value={bedLengthM}
                onChange={(e) => setBedLengthM(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-[11px]">Bededbredde (m)</label>
              <input
                type="number" step="0.05" min="0.3"
                className="input w-full mt-1"
                value={bedWidthM}
                onChange={(e) => setBedWidthM(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label text-[11px]">Gangbredde (m)</label>
              <input
                type="number" step="0.05" min="0.2"
                className="input w-full mt-1"
                value={pathWidthM}
                onChange={(e) => setPathWidthM(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Beregnet mål */}
          <div
            className="rounded-xl px-3 py-2 text-xs grid grid-cols-3 gap-2 text-center"
            style={{ background: "var(--surface-raised)" }}
          >
            <div>
              <p className="text-earth-500">Samlet bredde</p>
              <p className="text-earth-200 font-medium">{dims.totalWidthM} m</p>
            </div>
            <div>
              <p className="text-earth-500">Dyrkningsareal</p>
              <p className="text-earth-200 font-medium">{dims.bedAreaM2} m²</p>
            </div>
            <div>
              <p className="text-earth-500">Totalt areal</p>
              <p className="text-earth-200 font-medium">{dims.totalAreaM2} m²</p>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label className="label">Rotation</label>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 15 + 360) % 360)}
                className="p-2 rounded-lg transition-colors"
                style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
              >
                <RotateCcw size={16} />
              </button>
              <div className="flex-1 text-center">
                <span className="text-sm font-medium text-earth-100">{rotation}°</span>
                <p className="text-[10px] text-earth-500 mt-0.5">
                  {rotation === 0 ? "N–S" : rotation === 90 ? "Ø–V" : rotation === 45 ? "NØ–SV" : rotation === 135 ? "SØ–NV" : `${rotation}°`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 15) % 360)}
                className="p-2 rounded-lg transition-colors"
                style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>

          {/* Gem */}
          <button
            onClick={saveSection}
            disabled={saving || !sectionName.trim()}
            className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            style={{ background: "var(--clay)", color: "#fff" }}
          >
            <Check size={18} />
            {saving ? "Gemmer…" : `Placer ${bedCount} bede her`}
          </button>
        </div>
      )}
    </div>
  );
}
