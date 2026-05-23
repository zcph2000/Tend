"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { calcAreaHa, calcCentroid } from "@/lib/geodata";

interface DrawnField {
  geojson: { type: string; coordinates: number[][][] };
  area_ha: number;
  centroid: [number, number];
}

interface MapFieldEditorProps {
  onFieldDrawn: (field: DrawnField) => void;
  mapboxToken: string;
  initialCenter?: [number, number];
}

export default function MapFieldEditor({
  onFieldDrawn,
  mapboxToken,
  initialCenter = [11.0, 55.75],
}: MapFieldEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnArea, setDrawnArea] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"idle" | "drawing" | "done">("idle");

  const handleDrawUpdate = useCallback(() => {
    if (!drawRef.current) return;
    const data = drawRef.current.getAll();
    const feature = data.features?.[0];
    if (!feature || feature.geometry.type !== "Polygon") return;
    const coords = feature.geometry.coordinates;
    if (coords[0].length < 4) return; // ikke komplet endnu
    const area = calcAreaHa(coords);
    const centroid = calcCentroid(coords);
    setDrawnArea(area);
    setMode("done");
    onFieldDrawn({
      geojson: { type: "Polygon", coordinates: coords },
      area_ha: Math.round(area * 100) / 100,
      centroid,
    });
  }, [onFieldDrawn]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    let map: any;
    let draw: any;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      const MapboxDraw = (await import("@mapbox/mapbox-gl-draw")).default;

      mapboxgl.accessToken = mapboxToken;

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: initialCenter,
        zoom: 14,
      });

      draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: "simple_select",
        styles: [
          {
            id: "gl-draw-polygon-fill-inactive",
            type: "fill",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
            paint: { "fill-color": "#4c8027", "fill-opacity": 0.25 },
          },
          {
            id: "gl-draw-polygon-fill-active",
            type: "fill",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            paint: { "fill-color": "#4c8027", "fill-opacity": 0.35 },
          },
          {
            id: "gl-draw-polygon-stroke-inactive",
            type: "line",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
            paint: { "line-color": "#4c8027", "line-width": 2 },
          },
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            paint: { "line-color": "#4c8027", "line-width": 2, "line-dasharray": [0.2, 2] },
          },
          {
            id: "gl-draw-polygon-midpoint",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
            paint: { "circle-radius": 4, "circle-color": "#4c8027" },
          },
          {
            id: "gl-draw-polygon-and-line-vertex-active",
            type: "circle",
            filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
            paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-width": 2, "circle-stroke-color": "#4c8027" },
          },
          {
            id: "gl-draw-line-active",
            type: "line",
            filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
            paint: { "line-color": "#4c8027", "line-width": 2, "line-dasharray": [0.2, 2] },
          },
        ],
      });

      map.addControl(draw, "top-right");
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
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
        setIsDrawing(false);
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
    setIsDrawing(true);
    setMode("drawing");
    setDrawnArea(null);
  }

  function clearDrawing() {
    if (!drawRef.current) return;
    drawRef.current.deleteAll();
    setDrawnArea(null);
    setMode("idle");
    setIsDrawing(false);
  }

  return (
    <div className="space-y-2">
      {/* Kort */}
      <div
        ref={mapContainer}
        className="w-full rounded-xl overflow-hidden border border-earth-200"
        style={{ height: "300px" }}
      />

      {!loaded && (
        <p className="text-center text-earth-200 text-sm py-2">Kortet indlæses...</p>
      )}

      {/* Knapper */}
      {loaded && (
        <div className="flex gap-2">
          {mode !== "drawing" && (
            <button
              type="button"
              onClick={startDrawing}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-grass-600 text-white hover:bg-grass-700 transition-colors"
            >
              ✏️ {mode === "done" ? "Tegn om igen" : "Tegn mark på kort"}
            </button>
          )}
          {mode === "drawing" && (
            <div className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-grass-100 text-grass-700 border-2 border-grass-400 text-center">
              ✏️ Klik på kortet for at sætte punkter
            </div>
          )}
          {mode !== "idle" && (
            <button
              type="button"
              onClick={clearDrawing}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100"
            >
              Slet
            </button>
          )}
        </div>
      )}

      {mode === "drawing" && (
        <p className="text-xs text-earth-300 text-center">
          Klik for hvert hjørnepunkt · Klik på <strong>startpunktet</strong> igen for at afslutte
        </p>
      )}

      {drawnArea !== null && mode === "done" && (
        <div className="bg-grass-50 border border-grass-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-grass-700 text-sm font-medium">✓ Mark tegnet</span>
          <span className="text-grass-800 font-bold">{drawnArea.toFixed(2)} ha</span>
        </div>
      )}
    </div>
  );
}
