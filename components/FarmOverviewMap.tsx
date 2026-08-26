"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  generateSectionGeoJSON,
  generateSectionOutline,
  type SectionConfig,
} from "@/lib/bedGeometry";
import { ChevronLeft } from "lucide-react";

type GeoField = {
  id: string;
  name: string;
  area_ha: number | null;
  geojson: { type: string; coordinates: number[][][] } | null;
};

type Paddock = {
  id: string;
  field_id: string;
  name: string;
  area_ha: number | null;
  geojson: { type: string; coordinates: number[][][] } | null;
  active: boolean;
};

type PlacedSection = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  orientation_degrees: number | null;
  bed_count: number;
  bed_length_m: number | null;
  bed_width_m: number | null;
  path_width_m: number | null;
};

type PlacedBed = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  orientation_degrees: number | null;
  length_m: number | null;
  width_m: number | null;
};

type PlacedPolytunnel = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  orientation_degrees: number | null;
  length_m: number | null;
  width_m: number | null;
};

const SECTION_COLORS = [
  "#c2410c", "#15803d", "#1d4ed8", "#7e22ce",
  "#b45309", "#0e7490", "#be185d", "#4d7c0f",
];

function ringPoints(geojson: { coordinates: number[][][] } | null): [number, number][] {
  if (!geojson?.coordinates?.[0]) return [];
  return geojson.coordinates[0] as [number, number][];
}

export default function FarmOverviewMap({
  farmLat,
  farmLng,
  fields,
  paddocks,
  bedSections,
  beds,
  polytunnels,
  mapboxToken,
}: {
  farmLat: number;
  farmLng: number;
  fields: GeoField[];
  paddocks: Paddock[];
  bedSections: PlacedSection[];
  beds: PlacedBed[];
  polytunnels: PlacedPolytunnel[];
  mapboxToken: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

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

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        const boundsPoints: [number, number][] = [];

        // Marker (grøn, stiplet)
        fields.forEach((f) => {
          if (!f.geojson) return;
          const fid = `field-${f.id}`;
          const feature = { type: "Feature" as const, properties: { name: f.name }, geometry: f.geojson };
          map.addSource(fid, { type: "geojson", data: feature });
          map.addLayer({ id: `${fid}-fill`, type: "fill", source: fid,
            paint: { "fill-color": "#4ade80", "fill-opacity": 0.08 } });
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
          coords.forEach((c) => boundsPoints.push(c as [number, number]));

          map.on("click", `${fid}-fill`, () => router.push(`/farming/pastures/${f.id}`));
          map.on("mouseenter", `${fid}-fill`, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", `${fid}-fill`, () => { map.getCanvas().style.cursor = ""; });
        });

        // Folde/hegn — sektioner inde i marker (teal, grøn hvis aktiv afgræsning)
        paddocks.forEach((p) => {
          if (!p.geojson) return;
          const pid = `paddock-${p.id}`;
          const color = p.active ? "#4ade80" : "#2dd4bf";
          const feature = { type: "Feature" as const, properties: { name: p.name }, geometry: p.geojson };
          map.addSource(pid, { type: "geojson", data: feature });
          map.addLayer({ id: `${pid}-fill`, type: "fill", source: pid,
            paint: { "fill-color": color, "fill-opacity": p.active ? 0.35 : 0.2 } });
          map.addLayer({ id: `${pid}-outline`, type: "line", source: pid,
            paint: { "line-color": color, "line-width": 2 } });
          const coords = p.geojson.coordinates[0];
          const centroid = coords.reduce(
            (acc, c) => [acc[0] + c[0] / coords.length, acc[1] + c[1] / coords.length], [0, 0]
          );
          map.addSource(`${pid}-label`, { type: "geojson", data: {
            type: "Feature", properties: { name: p.name },
            geometry: { type: "Point", coordinates: centroid },
          }});
          map.addLayer({ id: `${pid}-label-l`, type: "symbol", source: `${pid}-label`,
            layout: { "text-field": ["get", "name"], "text-size": 11,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"] },
            paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.5 },
          });
          coords.forEach((c) => boundsPoints.push(c as [number, number]));

          map.on("click", `${pid}-fill`, () => router.push(`/farming/pastures/${p.field_id}`));
          map.on("mouseenter", `${pid}-fill`, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", `${pid}-fill`, () => { map.getCanvas().style.cursor = ""; });
        });

        // Bed-sektioner
        bedSections.filter(s => s.bed_count).forEach((s, idx) => {
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
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-anchor": "top", "text-offset": [0, 0.3] },
            paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,0.6)", "text-halo-width": 1.5 },
          });
          boundsPoints.push([s.center_lng, s.center_lat]);

          map.on("click", `${sid}-fill-l`, () => router.push(`/farming/beds/section/${s.id}`));
          map.on("mouseenter", `${sid}-fill-l`, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", `${sid}-fill-l`, () => { map.getCanvas().style.cursor = ""; });
        });

        // Enkelt bede (amber)
        beds.forEach((b) => {
          const cfg: SectionConfig = {
            centerLat: b.center_lat, centerLng: b.center_lng,
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
            type: "Feature", geometry: { type: "Point", coordinates: [b.center_lng, b.center_lat] },
            properties: { name: b.name },
          }});
          map.addLayer({ id: `${bid}-label-l`, type: "symbol", source: `${bid}-label`,
            layout: { "text-field": ["get", "name"], "text-size": 11,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"] },
            paint: { "text-color": "#fbbf24", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.5 },
          });
          boundsPoints.push([b.center_lng, b.center_lat]);

          map.on("click", `${bid}-fill-l`, () => router.push(`/farming/beds/${b.id}`));
          map.on("mouseenter", `${bid}-fill-l`, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", `${bid}-fill-l`, () => { map.getCanvas().style.cursor = ""; });
        });

        // Polytunneller (himmelblå)
        polytunnels.forEach((p) => {
          const cfg: SectionConfig = {
            centerLat: p.center_lat, centerLng: p.center_lng,
            bedCount: 1,
            bedLengthM: p.length_m ?? 20,
            bedWidthM: p.width_m ?? 6,
            pathWidthM: 0,
            rotationDeg: p.orientation_degrees ?? 0,
          };
          const pid = `polytunnel-${p.id}`;
          map.addSource(`${pid}-fill`, { type: "geojson", data: generateSectionGeoJSON(cfg) });
          map.addSource(`${pid}-outline`, { type: "geojson", data: generateSectionOutline(cfg) });
          map.addLayer({ id: `${pid}-outline-l`, type: "line", source: `${pid}-outline`,
            paint: { "line-color": "#38bdf8", "line-width": 1.5 } });
          map.addLayer({ id: `${pid}-fill-l`, type: "fill", source: `${pid}-fill`,
            paint: { "fill-color": "#38bdf8", "fill-opacity": 0.4 } });
          map.addSource(`${pid}-label`, { type: "geojson", data: {
            type: "Feature", geometry: { type: "Point", coordinates: [p.center_lng, p.center_lat] },
            properties: { name: p.name },
          }});
          map.addLayer({ id: `${pid}-label-l`, type: "symbol", source: `${pid}-label`,
            layout: { "text-field": ["get", "name"], "text-size": 11,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"] },
            paint: { "text-color": "#38bdf8", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1.5 },
          });
          boundsPoints.push([p.center_lng, p.center_lat]);

          map.on("click", `${pid}-fill-l`, () => router.push(`/farming/polytunnel/${p.id}`));
          map.on("mouseenter", `${pid}-fill-l`, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", `${pid}-fill-l`, () => { map.getCanvas().style.cursor = ""; });
        });

        if (boundsPoints.length > 0) {
          let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
          for (const [lng, lat] of boundsPoints) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
          map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, duration: 0 });
        }

        mapRef.current = map;
        setLoaded(true);
      });
    }

    initMap();
    return () => { if (map) map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPaddocks = paddocks.length;
  const activePaddocks = paddocks.filter(p => p.active).length;
  const totalBeds = bedSections.length + beds.length;
  const totalPolytunnels = polytunnels.length;

  return (
    <div className="relative" style={{ height: "calc(100dvh - 8rem)" }}>
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Tilbage */}
      <Link
        href="/dashboard"
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium shadow-lg"
        style={{ background: "rgba(21,26,16,0.9)", color: "var(--text-muted)", backdropFilter: "blur(8px)" }}
      >
        <ChevronLeft size={15} />
        Oversigt
      </Link>

      {/* Stats */}
      {loaded && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-xl text-xs shadow-lg flex items-center gap-2 whitespace-nowrap"
          style={{ background: "rgba(21,26,16,0.9)", color: "var(--text-muted)", backdropFilter: "blur(8px)" }}
        >
          <span style={{ color: "#4ade80" }}>■</span>
          {fields.length} {fields.length === 1 ? "mark" : "marker"}
          <span className="opacity-30">·</span>
          <span style={{ color: "#2dd4bf" }}>■</span>
          {totalPaddocks} {totalPaddocks === 1 ? "fold" : "folde"}
          {activePaddocks > 0 && <span className="opacity-60">({activePaddocks} aktive)</span>}
        </div>
      )}

      {/* Legend */}
      {loaded && (
        <div
          className="absolute bottom-4 left-3 right-3 z-10 rounded-2xl p-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]"
          style={{ background: "rgba(21,26,16,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="flex items-center gap-1.5 text-earth-300"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#4ade80" }} />Marker</span>
          <span className="flex items-center gap-1.5 text-earth-300"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#2dd4bf" }} />Folde</span>
          <span className="flex items-center gap-1.5 text-earth-300"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#fbbf24" }} />Bede ({totalBeds})</span>
          <span className="flex items-center gap-1.5 text-earth-300"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#38bdf8" }} />Polytunnel ({totalPolytunnels})</span>
        </div>
      )}
    </div>
  );
}
