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

const MAX_DOTS = 200;

// Rækkerne løber på langs af bedet (parallelt med bed-længden).
// rækkeafstand  = afstand TVÆRS AF bedet (bredden) mellem to rækker.
// planteafstand = afstand LANGS bedet (længden) mellem planter i en række.
export function calcLayout(
  bedWidthM: number,
  zone: Pick<PlantingZone, "zoneLengthM" | "rowSpacingCm" | "plantSpacingCm">
): PlantLayout {
  const rsCm = zone.rowSpacingCm;
  const psCm = zone.plantSpacingCm;
  if (!rsCm || !psCm || zone.zoneLengthM <= 0 || bedWidthM <= 0) {
    return { rows: 0, plantsPerRow: 0, total: 0, positions: [] };
  }
  const rsM = rsCm / 100;  // tværs af bredden
  const psM = psCm / 100;  // langs med længden

  const rows = Math.max(1, Math.floor(bedWidthM / rsM));
  const plantsPerRow = Math.max(1, Math.floor(zone.zoneLengthM / psM));

  // Centrér rækkerne i bedet (y-aksen = tværs af bredden)
  const rowGroupW = (rows - 1) * rsM;
  const rowStartY = (bedWidthM - rowGroupW) / 2;

  // Centrér planter i zonen (x-aksen = langs med længden)
  const plantGroupL = (plantsPerRow - 1) * psM;
  const plantStartX = (zone.zoneLengthM - plantGroupL) / 2;

  const positions: { xM: number; yM: number }[] = [];
  outer: for (let r = 0; r < rows; r++) {
    const yM = rowStartY + r * rsM;
    for (let p = 0; p < plantsPerRow; p++) {
      positions.push({ xM: plantStartX + p * psM, yM });
      if (positions.length >= MAX_DOTS) break outer;
    }
  }

  return { rows, plantsPerRow, total: rows * plantsPerRow, positions };
}
