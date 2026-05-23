// Konverter meter-offset fra et centrum til lat/lng koordinater
function metersToLatLng(
  centerLat: number,
  centerLng: number,
  dxMeters: number, // øst/vest
  dyMeters: number, // nord/syd
  rotationDeg: number
): [number, number] {
  const θ = (rotationDeg * Math.PI) / 180;
  // Roter offsettet
  const rx = dxMeters * Math.cos(θ) - dyMeters * Math.sin(θ);
  const ry = dxMeters * Math.sin(θ) + dyMeters * Math.cos(θ);
  // Konverter til grader (Danmark ~56°N)
  const lat = centerLat + ry / 111320;
  const lng = centerLng + rx / (111320 * Math.cos((centerLat * Math.PI) / 180));
  return [lng, lat]; // GeoJSON bruger [lng, lat]
}

export type SectionConfig = {
  centerLat: number;
  centerLng: number;
  bedCount: number;
  bedLengthM: number;
  bedWidthM: number;
  pathWidthM: number;
  rotationDeg: number;
};

// Generér GeoJSON for alle bede i en sektion
export function generateSectionGeoJSON(cfg: SectionConfig): GeoJSON.FeatureCollection {
  const { centerLat, centerLng, bedCount, bedLengthM, bedWidthM, pathWidthM, rotationDeg } = cfg;
  const totalWidth = bedCount * bedWidthM + (bedCount - 1) * pathWidthM;
  const features: GeoJSON.Feature[] = [];

  for (let i = 0; i < bedCount; i++) {
    const xCenter = -totalWidth / 2 + i * (bedWidthM + pathWidthM) + bedWidthM / 2;
    const hw = bedWidthM / 2;
    const hl = bedLengthM / 2;

    const corners: [number, number][] = [
      metersToLatLng(centerLat, centerLng, xCenter - hw, -hl, rotationDeg),
      metersToLatLng(centerLat, centerLng, xCenter + hw, -hl, rotationDeg),
      metersToLatLng(centerLat, centerLng, xCenter + hw,  hl, rotationDeg),
      metersToLatLng(centerLat, centerLng, xCenter - hw,  hl, rotationDeg),
      metersToLatLng(centerLat, centerLng, xCenter - hw, -hl, rotationDeg),
    ];

    features.push({
      type: "Feature",
      properties: { bedIndex: i },
      geometry: { type: "Polygon", coordinates: [corners] },
    });
  }

  return { type: "FeatureCollection", features };
}

// Generér sektionsrammen (inklusive gange)
export function generateSectionOutline(cfg: SectionConfig): GeoJSON.Feature {
  const { centerLat, centerLng, bedCount, bedLengthM, bedWidthM, pathWidthM, rotationDeg } = cfg;
  const totalWidth = bedCount * bedWidthM + (bedCount - 1) * pathWidthM;
  const hw = totalWidth / 2;
  const hl = bedLengthM / 2;

  const corners: [number, number][] = [
    metersToLatLng(centerLat, centerLng, -hw, -hl, rotationDeg),
    metersToLatLng(centerLat, centerLng,  hw, -hl, rotationDeg),
    metersToLatLng(centerLat, centerLng,  hw,  hl, rotationDeg),
    metersToLatLng(centerLat, centerLng, -hw,  hl, rotationDeg),
    metersToLatLng(centerLat, centerLng, -hw, -hl, rotationDeg),
  ];

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [corners] },
  };
}

// Beregn sektionens totale mål som tekst
export function sectionDimensions(cfg: Pick<SectionConfig, "bedCount" | "bedLengthM" | "bedWidthM" | "pathWidthM">) {
  const totalWidth = cfg.bedCount * cfg.bedWidthM + (cfg.bedCount - 1) * cfg.pathWidthM;
  return {
    totalWidthM: Math.round(totalWidth * 100) / 100,
    totalLengthM: cfg.bedLengthM,
    totalAreaM2: Math.round(totalWidth * cfg.bedLengthM * 10) / 10,
    bedAreaM2: Math.round(cfg.bedCount * cfg.bedWidthM * cfg.bedLengthM * 10) / 10,
  };
}
