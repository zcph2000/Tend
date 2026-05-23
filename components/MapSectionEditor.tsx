"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { calcAreaHa, calcCentroid } from "@/lib/geodata";

interface DrawnSection {
  geojson: { type: string; coordinates: number[][][] };
  area_ha: number;
  centroid: [number, number];
}

interface MapSectionEditorProps {
  onSectionDrawn: (section: DrawnSection) => void;
  mapboxToken: string;
  fieldGeojson?: { type: string; coordinates: number[][][] } | null;
  existingSections?: { geojson?: { type: string; coordinates: number[][][] } | null; name: string }[];
  initialCenter?: [number, number];
}

export default function MapSectionEditor({
  onSectionDrawn,
  mapboxToken,
  fieldGeojson,
  existingSections = [],
  initialCenter = [11.0, 55.75],
}: MapSectionEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"idle" | "drawing" | "done">("idle");
  const [drawnArea, setDrawnArea] = useState<number | null>(null);

  const handleDrawUpdate = useCallback(() => {
    if (!drawRef.current) return;
    const data = drawRef.current.getAll();
    // Kun kig på features der IKKE er felt-outline (id starter med "field-")
    const drawn = data.features?.filter((f: { id: string }) => !f.id.toString().startsWith("field-"));
    const feature = drawn?.[0];
    if (!feature || feature.geometry.type !== "Polygon") return;
    const coords = feature.geometry.coordinates;
    if (coords[0].length < 4) return;

    const area = calcAreaHa(coords);
    const centroid = calcCentroid(coords);
    setDrawnArea(area);
    setMode("done");
    onSectionDrawn({
      geojson: { type: "Polygon", coordinates: coords },
      area_ha: Math.round(area * 100) / 100,
      centroid,
    });
  }, [onSectionDrawn]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let map: any;
    let draw: any;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      const MapboxDraw = (await import("@mapbox/mapbox-gl-draw")).default;

      mapboxgl.accessToken = mapboxToken;

      // Bestem center ud fra marken hvis muligt
      let center: [number, number] = initialCenter;
      if (fieldGeojson?.coordinates) {
        center = calcCentroid(fieldGeojson.coordinates);
      }

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center,
        zoom: 15,
      });

      draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: "simple_select",
        styles: [
          {
            id: "gl-draw-polygon-fill-active",
            type: "fill",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            paint: { "fill-color": "#f59e0b", "fill-opacity": 0.35 },
          },
          {
            id: "gl-draw-polygon-fill-inactive",
            type: "fill",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
            paint: { "fill-color": "#f59e0b", "fill-opacity": 0.25 },
          },
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [0.2, 2] },
          },
          {
            id: "gl-draw-polygon-stroke-inactive",
            type: "line",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
            paint: { "line-color": "#d97706", "line-width": 2 },
          },
          {
            id: "gl-draw-polygon-and-line-vertex-active",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
            paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-width": 2, "circle-stroke-color": "#d97706" },
          },
          {
            id: "gl-draw-polygon-midpoint",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
            paint: { "circle-radius": 4, "circle-color": "#d97706" },
          },
          {
            id: "gl-draw-line-active",
            type: "line",
            filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
            paint: { "line-color": "#f59e0b", "line-width": 2, "line-dasharray": [0.2, 2] },
          },
        ],
      });

      map.addControl(draw, "top-right");
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        // Vis markgrænsen som reference-lag
        if (fieldGeojson) {
          map.addSource("field-boundary", {
            type: "geojson",
            data: { type: "Feature", geometry: fieldGeojson, properties: {} },
          });
          map.addLayer({
            id: "field-boundary-fill",
            type: "fill",
            source: "field-boundary",
            paint: { "fill-color": "#4c8027", "fill-opacity": 0.15 },
          });
          map.addLayer({
            id: "field-boundary-line",
            type: "line",
            source: "field-boundary",
            paint: { "line-color": "#4c8027", "line-width": 3, "line-dasharray": [4, 2] },
          });
        }

        // Vis eksisterende sektioner
        existingSections.forEach((section, i) => {
          if (!section.geojson) return;
          const sourceId = `existing-section-${i}`;
          map.addSource(sourceId, {
            type: "geojson",
            data: { type: "Feature", geometry: section.geojson, properties: { name: section.name } },
          });
          map.addLayer({
            id: `${sourceId}-fill`,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": "#4c8027", "fill-opacity": 0.3 },
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#4c8027", "line-width": 1.5 },
          });
        });

        map.doubleClickZoom.disable();
        setLoaded(true);
        mapRef.current = map;
        drawRef.current = draw;
      });

      map.on("draw.create", handleDrawUpdate);
      map.on("draw.update", handleDrawUpdate);
      map.on("draw.delete", () => {
        setDrawnArea(null);
        setMode("idle");
      });
    }

    initMap();

    return () => {
      if (map) map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  function startDrawing() {
    if (!drawRef.current || !mapRef.current) return;
    mapRef.current.doubleClickZoom.disable();
    drawRef.current.deleteAll();
    drawRef.current.changeMode("draw_polygon");
    setMode("drawing");
    setDrawnArea(null);
  }

  function clearDrawing() {
    if (!drawRef.current) return;
    drawRef.current.deleteAll();
    setDrawnArea(null);
    setMode("idle");
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapContainer}
        className="w-full rounded-xl overflow-hidden border border-earth-200"
        style={{ height: "280px" }}
      />

      {!loaded && (
        <p className="text-center text-earth-200 text-sm py-2">Kort indlæses...</p>
      )}

      {loaded && (
        <div className="flex gap-2">
          {mode !== "drawing" && (
            <button
              type="button"
              onClick={startDrawing}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              ✏️ {mode === "done" ? "Tegn om igen" : "Tegn sektion"}
            </button>
          )}
          {mode === "drawing" && (
            <div className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 border-2 border-amber-400 text-center">
              ✏️ Klik punkter langs sektionskanten
            </div>
          )}
          {mode !== "idle" && (
            <button
              type="button"
              onClick={clearDrawing}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600"
            >
              Slet
            </button>
          )}
        </div>
      )}

      {mode === "drawing" && (
        <p className="text-xs text-earth-300 text-center">
          Grøn stiplet linje = markgrænsen · Gul = din sektion · Klik første punkt igen for at afslutte
        </p>
      )}

      {drawnArea !== null && mode === "done" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-amber-700 text-sm font-medium">✓ Sektion tegnet</span>
          <span className="text-amber-800 font-bold">{drawnArea.toFixed(2)} ha</span>
        </div>
      )}
    </div>
  );
}
