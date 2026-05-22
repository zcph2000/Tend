// ============================================
// Geodata — automatisk datahentning for marker
// ============================================

export interface SoilData {
  texture: string;
  ph: number | null;
  organic_carbon: number | null;
  clay_percent: number | null;
  sand_percent: number | null;
  silt_percent: number | null;
}

export interface ElevationData {
  elevation_m: number;
  slope_deg: number | null;
  aspect: string | null; // N, NE, E, SE, S, SW, W, NW
}

export interface FieldGeoData {
  soil: SoilData | null;
  elevation: ElevationData | null;
  area_ha: number;
  centroid: [number, number]; // [lng, lat]
}

// Beregn areal i hektar fra GeoJSON polygon koordinater (Shoelace formula)
// Koordinater er [lng, lat] i WGS84
export function calcAreaHa(coordinates: number[][][]): number {
  const coords = coordinates[0];
  if (coords.length < 3) return 0;

  // Brug første punkt som referencepunkt og konverter til meter
  const refLng = coords[0][0];
  const refLat = coords[0][1];
  const latRad = (refLat * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);

  // Konverter alle punkter til meter relativt til referencepunktet
  const points = coords.map(([lng, lat]) => [
    (lng - refLng) * metersPerDegLng,
    (lat - refLat) * metersPerDegLat,
  ]);

  // Shoelace formula på kartesiske meter-koordinater
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    area += points[i][0] * points[i + 1][1];
    area -= points[i + 1][0] * points[i][1];
  }

  const areaSqM = Math.abs(area) / 2;
  return areaSqM / 10000; // m² → ha
}

// Find centroid fra polygon koordinater
export function calcCentroid(coordinates: number[][][]): [number, number] {
  const coords = coordinates[0];
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lng, lat];
}

// Hent jordbundsdata fra SoilGrids (ISRIC) — gratis, ingen API-nøgle
export async function fetchSoilData(lat: number, lng: number): Promise<SoilData | null> {
  try {
    const props = "phh2o,ocd,clay,sand,silt";
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=${props}&depth=0-30cm&value=mean`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();

    const get = (prop: string) =>
      json.properties?.layers?.find((l: { name: string }) => l.name === prop)
        ?.depths?.[0]?.values?.mean ?? null;

    const phRaw = get("phh2o");
    const ocd = get("ocd");
    const clay = get("clay");
    const sand = get("sand");
    const silt = get("silt");

    // Bestem teksturklasse
    const texture = classifyTexture(clay, sand, silt);

    return {
      texture,
      ph: phRaw ? phRaw / 10 : null,
      organic_carbon: ocd ? ocd / 10 : null,
      clay_percent: clay ? clay / 10 : null,
      sand_percent: sand ? sand / 10 : null,
      silt_percent: silt ? silt / 10 : null,
    };
  } catch {
    return null;
  }
}

// Hent elevationsdata — Open-Elevation (gratis)
export async function fetchElevationData(lat: number, lng: number): Promise<ElevationData | null> {
  try {
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json();
    const elevation = json.results?.[0]?.elevation ?? null;

    return {
      elevation_m: elevation,
      slope_deg: null, // kræver flere punkter — tilføjes i v2
      aspect: null,
    };
  } catch {
    return null;
  }
}

// Hent al geodata for en mark på én gang
export async function fetchFieldGeoData(
  geojson: { coordinates: number[][][] }
): Promise<FieldGeoData> {
  const centroid = calcCentroid(geojson.coordinates);
  const area_ha = calcAreaHa(geojson.coordinates);
  const [lng, lat] = centroid;

  const [soil, elevation] = await Promise.all([
    fetchSoilData(lat, lng),
    fetchElevationData(lat, lng),
  ]);

  return { soil, elevation, area_ha, centroid };
}

// Klassificér jordtekstur ud fra USDA-trekant
function classifyTexture(
  clay: number | null,
  sand: number | null,
  silt: number | null
): string {
  if (!clay || !sand || !silt) return "Ukendt";
  const c = clay / 10;
  const sa = sand / 10;

  if (c >= 40) return "Ler";
  if (c >= 27 && sa <= 45) return "Lermuld";
  if (sa >= 70 && c < 15) return "Sand";
  if (sa >= 50 && c < 20) return "Sandet muld";
  if (c >= 20 && c < 35) return "Sandmuld";
  return "Muld";
}
