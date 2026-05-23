"use client";

import { useEffect, useRef, useState } from "react";

// ── Geometri ──────────────────────────────────────────────────────────────────

function toLM(lng: number, lat: number, rLng: number, rLat: number): [number, number] {
  const latRad = (rLat * Math.PI) / 180;
  return [(lng - rLng) * 111320 * Math.cos(latRad), (lat - rLat) * 111320];
}
function fromLM(x: number, y: number, rLng: number, rLat: number): [number, number] {
  const latRad = (rLat * Math.PI) / 180;
  return [rLng + x / (111320 * Math.cos(latRad)), rLat + y / 111320];
}
function rot(x: number, y: number, a: number): [number, number] {
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}
function longestEdgeAngle(pts: [number, number][]): number {
  let maxLen = 0, angle = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const len = Math.hypot(dx, dy);
    if (len > maxLen) { maxLen = len; angle = Math.atan2(dy, dx); }
  }
  return angle;
}
function horizIntersect(pts: [number, number][], yVal: number): number[] {
  const xs: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if (Math.abs(y2 - y1) < 1e-10) continue;
    if ((y1 <= yVal && yVal <= y2) || (y2 <= yVal && yVal <= y1))
      xs.push(x1 + ((yVal - y1) / (y2 - y1)) * (x2 - x1));
  }
  return xs.sort((a, b) => a - b);
}
function polyAreaM2(pts: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < pts.length - 1; i++)
    area += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  return Math.abs(area) / 2;
}
function nearestSegmentIdx(pts: [number, number][], p: [number, number]): number {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy));
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

/** Sutherland-Hodgman clip mod en vandret grænse */
function clipPolyToPlane(
  poly: [number, number][],
  yVal: number,
  keepAbove: boolean
): [number, number][] {
  if (poly.length === 0) return [];
  // Fjern evt. afsluttende duplikat-punkt
  const pts = poly[poly.length - 1][0] === poly[0][0] && poly[poly.length - 1][1] === poly[0][1]
    ? poly.slice(0, -1) : poly;
  const inside = (p: [number, number]) => keepAbove ? p[1] >= yVal : p[1] <= yVal;
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i], next = pts[(i + 1) % pts.length];
    const cIn = inside(curr), nIn = inside(next);
    if (cIn) out.push(curr);
    if (cIn !== nIn) {
      const t = (yVal - curr[1]) / (next[1] - curr[1]);
      out.push([curr[0] + t * (next[0] - curr[0]), yVal]);
    }
  }
  if (out.length > 0) out.push(out[0]); // luk polygon
  return out;
}

function clipPolyToYBand(
  pts: [number, number][],
  yLo: number,
  yHi: number
): [number, number][] {
  let result = clipPolyToPlane(pts, yLo, true);
  result = clipPolyToPlane(result, yHi, false);
  return result;
}

type DivMode = "across" | "along";
interface FieldGeom {
  rLng: number; rLat: number; rotAngle: number;
  rotPts: [number, number][]; minY: number; maxY: number; fieldAreaHa: number;
}

function buildFieldGeom(coords: number[][], mode: DivMode): FieldGeom {
  const rLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const rLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const ptsM = coords.map(c => toLM(c[0], c[1], rLng, rLat)) as [number, number][];
  const longAngle = longestEdgeAngle(ptsM);
  const rotAngle = mode === "across" ? -longAngle : -(longAngle + Math.PI / 2);
  const rotPts = ptsM.map(p => rot(p[0], p[1], rotAngle)) as [number, number][];
  const ys = rotPts.map(p => p[1]);
  return { rLng, rLat, rotAngle, rotPts, minY: Math.min(...ys), maxY: Math.max(...ys), fieldAreaHa: polyAreaM2(ptsM) / 10000 };
}

function autoFencePoints(geom: FieldGeom, pos: number): [number, number][] {
  const yLine = geom.minY + pos * (geom.maxY - geom.minY);
  const xs = horizIntersect(geom.rotPts, yLine);
  if (xs.length < 2) return [];
  const [sxM, syM] = rot(xs[0], yLine, -geom.rotAngle);
  const [exM, eyM] = rot(xs[xs.length - 1], yLine, -geom.rotAngle);
  return [fromLM(sxM, syM, geom.rLng, geom.rLat), fromLM(exM, eyM, geom.rLng, geom.rLat)];
}

function effectivePos(pts: [number, number][], geom: FieldGeom): number {
  if (pts.length === 0) return 0.5;
  const ys = pts.map(p => {
    const [mx, my] = toLM(p[0], p[1], geom.rLng, geom.rLat);
    const [, ry] = rot(mx, my, geom.rotAngle);
    return (ry - geom.minY) / (geom.maxY - geom.minY);
  });
  return ys.reduce((s, y) => s + y, 0) / ys.length;
}

/** Beregn sektionspolygon (i lng/lat) ved at klippe markpolygonen i et Y-bånd */
function sectionPolygonCoords(
  geom: FieldGeom,
  yFracLo: number,
  yFracHi: number
): [number, number][] {
  const yLo = geom.minY + yFracLo * (geom.maxY - geom.minY);
  const yHi = geom.minY + yFracHi * (geom.maxY - geom.minY);
  const clipped = clipPolyToYBand(geom.rotPts, yLo, yHi);
  return clipped.map(([rx, ry]) => {
    const [mx, my] = rot(rx, ry, -geom.rotAngle);
    return fromLM(mx, my, geom.rLng, geom.rLat);
  });
}

// ── Komponent ─────────────────────────────────────────────────────────────────

interface Props {
  fieldGeojson: { type: string; coordinates: number[][][] };
  sectionCount: number;
  mapboxToken?: string;
}

export default function FenceGuide({ fieldGeojson, sectionCount, mapboxToken }: Props) {
  const coords = fieldGeojson.coordinates[0];

  const [mode, setMode] = useState<DivMode>("across");
  const [positions] = useState<number[]>(() =>
    Array.from({ length: sectionCount - 1 }, (_, i) => (i + 1) / sectionCount)
  );
  const [customFences, setCustomFences] = useState<([number, number][] | null)[]>(() =>
    Array(sectionCount - 1).fill(null)
  );
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const geom = buildFieldGeom(coords, mode);

  // activeFenceIdx: hegnet til højre for den valgte sektion
  const activeFenceIdx = selectedSection !== null && selectedSection < sectionCount - 1
    ? selectedSection : null;

  function getFencePoints(i: number): [number, number][] {
    return customFences[i] ?? autoFencePoints(geom, positions[i]);
  }

  // Sektionsstørrelser
  const effPos = customFences.map((cf, i) =>
    effectivePos(cf ?? autoFencePoints(geom, positions[i]), geom)
  );
  const boundaries = [0, ...effPos, 1];
  const sectionAreas = Array.from({ length: sectionCount }, (_, i) =>
    (boundaries[i + 1] - boundaries[i]) * geom.fieldAreaHa
  );

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const activeFenceIdxRef = useRef<number | null>(null);
  const editModeRef = useRef(false);
  const geomRef = useRef(geom);
  activeFenceIdxRef.current = activeFenceIdx;
  editModeRef.current = editMode;
  geomRef.current = geom;

  // Stabil reference til selectSection (fanger opdateret state i map-click handler)
  const selectSectionRef = useRef<(i: number) => void>(() => {});

  function buildFencesGeoJSON() {
    return {
      type: "FeatureCollection" as const,
      features: Array.from({ length: sectionCount - 1 }, (_, i) => ({
        type: "Feature" as const,
        properties: { active: i === activeFenceIdx },
        geometry: { type: "LineString" as const, coordinates: getFencePoints(i) },
      })),
    };
  }

  function buildSectionsGeoJSON(bounds: number[], sel: number | null) {
    return {
      type: "FeatureCollection" as const,
      features: Array.from({ length: sectionCount }, (_, i) => ({
        type: "Feature" as const,
        properties: {
          sectionIndex: i,
          selected: i === sel ? 1 : 0,
          selectable: i < sectionCount - 1 ? 1 : 0,
          areaHa: ((bounds[i + 1] - bounds[i]) * geomRef.current.fieldAreaHa).toFixed(2),
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [sectionPolygonCoords(geomRef.current, bounds[i], bounds[i + 1])],
        },
      })),
    };
  }

  // Initiér kort
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || mapRef.current) return;
    async function init() {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = mapboxToken!;
      const lngs = coords.map(c => c[0]), lats = coords.map(c => c[1]);
      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        bounds: [[Math.min(...lngs) - 0.001, Math.min(...lats) - 0.001],
                 [Math.max(...lngs) + 0.001, Math.max(...lats) + 0.001]],
        fitBoundsOptions: { padding: 40 },
        scrollZoom: true,
      });
      mapRef.current = map;

      map.on("load", () => {
        // Markpolygon
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addSource("field", { type: "geojson", data: { type: "Feature", geometry: fieldGeojson } as any });
        map.addLayer({ id: "field-outline", type: "line", source: "field",
          paint: { "line-color": "#16a34a", "line-width": 2 } });

        // Sektioner (klikbare fill-layers)
        map.addSource("sections", { type: "geojson", data: buildSectionsGeoJSON([0, ...positions.map((_, i) => (i + 1) / sectionCount), 1].slice(0, sectionCount + 1), null) });
        map.addLayer({
          id: "sections-fill", type: "fill", source: "sections",
          paint: {
            "fill-color": ["case", ["==", ["get", "selected"], 1], "#f97316", "#22c55e"],
            "fill-opacity": ["case", ["==", ["get", "selected"], 1], 0.35, 0.1],
          },
        });

        // Hegnslinjer (oven på sektionerne)
        map.addSource("fences", { type: "geojson", data: buildFencesGeoJSON() });
        map.addLayer({ id: "fences", type: "line", source: "fences",
          paint: {
            "line-color":  ["case", ["==", ["get", "active"], true], "#f97316", "#fbbf24"],
            "line-width":  ["case", ["==", ["get", "active"], true], 3.5, 2],
            "line-dasharray": [5, 3],
          },
        });

        // Klik på sektion (kun når IKKE i redigeringstilstand)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", "sections-fill", (e: any) => {
          if (editModeRef.current) return;
          const idx = e.features?.[0]?.properties?.sectionIndex;
          if (idx !== undefined && idx !== null) {
            selectSectionRef.current(idx);
          }
        });

        // Cursor ved hover
        map.on("mouseenter", "sections-fill", () => {
          if (!editModeRef.current) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "sections-fill", () => {
          map.getCanvas().style.cursor = "";
        });

        // Tilføj punkt ved klik — kun i redigeringstilstand
        map.on("click", (e: { lngLat: { lng: number; lat: number } }) => {
          if (!editModeRef.current) return;
          const i = activeFenceIdxRef.current;
          if (i === null) return;
          const newPt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          setCustomFences(prev => {
            const pts = prev[i] ?? autoFencePoints(geomRef.current, positions[i]);
            const insertAfter = nearestSegmentIdx(pts, newPt);
            const next = [...prev];
            next[i] = [...pts.slice(0, insertAfter + 1), newPt, ...pts.slice(insertAfter + 1)];
            return next;
          });
        });

        setMapReady(true);
      });
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Opdatér hegnslinjer
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const src = mapRef.current.getSource("fences") as any;
    if (src) src.setData(buildFencesGeoJSON());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFences, activeFenceIdx, mapReady]);

  // Opdatér sektionspolygoner og farver
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const src = mapRef.current.getSource("sections") as any;
    if (src) src.setData(buildSectionsGeoJSON(boundaries, selectedSection));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaries.join(","), selectedSection, mapReady]);


  // Draggable markers — kun synlige i redigeringstilstand
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (!editMode || activeFenceIdx === null) return;

    async function addMarkers() {
      const mapboxgl = (await import("mapbox-gl")).default;
      const pts = getFencePoints(activeFenceIdx!);
      pts.forEach((pt, ptIdx) => {
        const el = document.createElement("div");
        el.style.cssText = `
          width:20px;height:20px;border-radius:50%;
          background:${ptIdx === 0 || ptIdx === pts.length - 1 ? "#3b82f6" : "#f97316"};
          border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);
          cursor:grab;display:flex;align-items:center;justify-content:center;
          font-size:9px;color:white;font-weight:bold;
        `;
        el.textContent = ptIdx === 0 ? "A" : ptIdx === pts.length - 1 ? "B" : `${ptIdx}`;

        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat(pt).addTo(mapRef.current);

        marker.on("drag", () => {
          const { lng, lat } = marker.getLngLat();
          setCustomFences(prev => {
            const i = activeFenceIdxRef.current!;
            const current = prev[i] ?? autoFencePoints(geomRef.current, positions[i]);
            const next = [...prev];
            const pts2 = [...current];
            pts2[ptIdx] = [lng, lat];
            next[i] = pts2;
            return next;
          });
        });
        markersRef.current.push(marker);
      });
    }
    addMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, activeFenceIdx, mapReady, customFences.map((_, i) => customFences[i]?.length ?? 0).join(",")]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function selectSection(i: number) {
    if (i >= sectionCount - 1) {
      // Sidste sektion: klik deselekterer
      setSelectedSection(null);
      setEditMode(false);
      return;
    }
    setCopied(false);
    setEditMode(false);
    setSelectedSection(prev => {
      if (prev === i) return null; // toggle off
      return i;
    });
    // Initialisér hegn med auto-punkter hvis ikke gjort endnu
    setCustomFences(prev => {
      if (prev[i] !== null) return prev;
      const pts = autoFencePoints(geomRef.current, positions[i]);
      const n = [...prev]; n[i] = pts; return n;
    });
  }
  // Opdatér stabil ref
  selectSectionRef.current = selectSection;

  function toggleEdit() {
    setEditMode(e => !e);
  }

  function undoLastPoint() {
    const i = activeFenceIdx;
    if (i === null) return;
    setCustomFences(prev => {
      const pts = prev[i];
      if (!pts || pts.length <= 2) return prev;
      const n = [...prev];
      n[i] = [pts[0], ...pts.slice(1, -1).slice(0, -1), pts[pts.length - 1]];
      return n;
    });
  }

  function resetFence() {
    const i = activeFenceIdx;
    if (i === null) return;
    setCustomFences(prev => { const n = [...prev]; n[i] = null; return n; });
    setEditMode(false);
  }

  function copyCoords() {
    if (activeFenceIdx === null) return;
    const pts = getFencePoints(activeFenceIdx);
    const text = `Hegn ${activeFenceIdx + 1} (${pts.length} punkter)\n` +
      pts.map((p, j) => `${j === 0 ? "A" : j === pts.length - 1 ? "B" : `P${j}`}: ${p[1].toFixed(6)}, ${p[0].toFixed(6)}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function changeMode(m: DivMode) {
    setMode(m);
    setCustomFences(Array(sectionCount - 1).fill(null));
    setSelectedSection(null);
    setEditMode(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const activePts = activeFenceIdx !== null ? getFencePoints(activeFenceIdx) : null;
  const activeInnerPts = activePts ? activePts.slice(1, -1) : [];
  const activeIsCustom = activeFenceIdx !== null && customFences[activeFenceIdx] !== null;
  const activeAreaHa = activeFenceIdx !== null ? sectionAreas[activeFenceIdx] : null;

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-earth-50 text-sm">Hegnsplan</h3>
        <span className="text-xs text-earth-200">{sectionCount - 1} hegn · {sectionCount} sektioner</span>
      </div>

      {/* Tilstand */}
      <div className="flex gap-2">
        {(["across", "along"] as DivMode[]).map(m => (
          <button key={m} onClick={() => changeMode(m)}
            className={`flex-1 py-2 rounded-xl border-2 text-xs font-medium transition-colors ${
              mode === m ? "border-grass-500 bg-grass-50 text-grass-700" : "border-earth-200 text-earth-300"
            }`}>
            {m === "across" ? "Tværs af marken" : "Langs marken"}
            <span className="block font-normal text-[10px] mt-0.5 opacity-70">
              {m === "across" ? "Hegn ↔ kortsiden" : "Hegn ↔ langsiden"}
            </span>
          </button>
        ))}
      </div>

      {/* Kort */}
      {mapboxToken ? (
        <div className="relative">
          <div ref={mapContainer} className="w-full h-[22rem] rounded-xl overflow-hidden" />
          {/* Hint første gang */}
          {selectedSection === null && !editMode && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-xs rounded-lg px-3 py-2 text-center pointer-events-none">
              Tryk på en sektion for at vælge dens hegn
            </div>
          )}
          {editMode && (
            <div className="absolute top-2 left-2 right-2 bg-black/60 text-white text-xs rounded-lg px-3 py-2 text-center pointer-events-none">
              Tryk på kortet for at tilføje punkter · Træk punkter for at flytte dem
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-40 rounded-xl bg-earth-100 flex items-center justify-center">
          <p className="text-xs text-earth-200">Kort kræver Mapbox-token</p>
        </div>
      )}

      {/* Info-panel — vises når en sektion er valgt */}
      {selectedSection !== null && activeFenceIdx !== null && activePts && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 space-y-3">

          {/* Valgt sektion — stor og tydelig, opdaterer live */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-orange-400 uppercase tracking-wide">
                Sektion {activeFenceIdx + 1}
              </p>
              <p className="text-3xl font-bold text-earth-50 leading-none mt-1">
                {sectionAreas[activeFenceIdx].toFixed(2)}
                <span className="text-base font-normal text-earth-300 ml-1">ha</span>
              </p>
            </div>
            <button onClick={toggleEdit}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                editMode ? "bg-orange-300 text-orange-900" : "bg-orange-500 text-white"
              }`}>
              {editMode ? "Færdig" : "Rediger"}
            </button>
          </div>

          {/* Hegn-skillelinje */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t-2 border-dashed border-orange-300" />
            <span className="text-[10px] text-orange-400 font-medium">Hegn {activeFenceIdx + 1}</span>
            <div className="flex-1 border-t-2 border-dashed border-orange-300" />
          </div>

          {/* Tilstødende sektion */}
          <div>
            <p className="text-xs text-earth-200">Sektion {activeFenceIdx + 2}</p>
            <p className="text-xl font-semibold text-earth-400 leading-none mt-0.5">
              {sectionAreas[activeFenceIdx + 1]?.toFixed(2)}
              <span className="text-sm font-normal text-earth-200 ml-1">ha</span>
            </p>
          </div>

          {/* Handlinger */}
          <div className="flex gap-2 pt-1">
            <button onClick={copyCoords}
              className="flex-1 py-1.5 rounded-xl border border-orange-200 bg-white text-xs text-earth-400 font-medium">
              {copied ? "✓ Kopieret" : "Kopier GPS"}
            </button>
            {editMode && activeInnerPts.length > 0 && (
              <button onClick={undoLastPoint}
                className="flex-1 py-1.5 rounded-xl border border-orange-200 bg-white text-xs text-earth-400">
                ↩ Fjern punkt
              </button>
            )}
            {editMode && activeIsCustom && (
              <button onClick={resetFence}
                className="flex-1 py-1.5 rounded-xl border border-orange-200 bg-white text-xs text-earth-300">
                Nulstil
              </button>
            )}
          </div>

          {/* Redigerings-hint */}
          {editMode && (
            <p className="text-xs text-earth-200 text-center -mt-1">
              {activeInnerPts.length === 0
                ? "Tryk på kortet for at tilføje omvejspunkter"
                : `${activeInnerPts.length} omvejspunkt${activeInnerPts.length !== 1 ? "er" : ""} tilføjet`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
