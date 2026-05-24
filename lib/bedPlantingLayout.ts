export type PlantingZone = {
  id: string;
  cropName: string;
  varietyName: string | null;
  family: string | null;
  offsetM: number;
  zoneLengthM: number;
  rowSpacingCm: number | null;
  plantSpacingCm: number | null;
};

export type PlantLayout = {
  rows: number;
  plantsPerRow: number;
  total: number;
  positions: { xM: number; yM: number }[];
};

export const FAMILY_COLORS: Record<string, string> = {
  "Natskyggefamilien":   "#ef4444",
  "Korsblomstfamilien":  "#f59e0b",
  "Skærmblomstfamilien": "#22c55e",
  "Ærtefamilien":        "#38bdf8",
  "Græskarfamilien":     "#f97316",
  "Rosenfamilien":       "#ec4899",
  "Amarantfamilien":     "#a855f7",
  "Løgfamilien":         "#eab308",
  "Kurvblomstfamilien":  "#10b981",
};

export function zoneColor(family: string | null): string {
  return family ? (FAMILY_COLORS[family] ?? "#94a3b8") : "#94a3b8";
}

const MAX_DOTS = 180;

export function calcLayout(
  bedWidthM: number,
  zone: Pick<PlantingZone, "zoneLengthM" | "rowSpacingCm" | "plantSpacingCm">
): PlantLayout {
  const rsCm = zone.rowSpacingCm;
  const psCm = zone.plantSpacingCm;
  if (!rsCm || !psCm || zone.zoneLengthM <= 0 || bedWidthM <= 0) {
    return { rows: 0, plantsPerRow: 0, total: 0, positions: [] };
  }
  const rsM = rsCm / 100;
  const psM = psCm / 100;

  const rows = Math.max(1, Math.floor(zone.zoneLengthM / rsM));
  const plantsPerRow = Math.max(1, Math.floor(bedWidthM / psM));

  const positions: { xM: number; yM: number }[] = [];
  outer: for (let r = 0; r < rows; r++) {
    const xM = rsM / 2 + r * rsM;
    for (let p = 0; p < plantsPerRow; p++) {
      positions.push({ xM, yM: psM / 2 + p * psM });
      if (positions.length >= MAX_DOTS) break outer;
    }
  }

  return { rows, plantsPerRow, total: rows * plantsPerRow, positions };
}
