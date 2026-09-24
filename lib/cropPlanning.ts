import { YIELD_KG_PER_PLANT } from "@/lib/companionPlants";

// ─── Types (delt mellem Forspiringsoverblik, Bedplanlægger og Sæsonplan) ──────

export type VarietyOption = {
  id: string;
  name: string;
  days_to_harvest_transplant: number | null;
  weeks_to_transplant: number | null;
  harvest_from_month: number | null;
  harvest_to_month: number | null;
  row_spacing_cm: number | null;
  plant_spacing_cm: number | null;
  yield_kg_per_sqm_min: number | null;
  yield_kg_per_sqm_max: number | null;
  crop_species: { name_da: string; crop_families: { name_da: string } | null } | null;
};

export type BedPlanting = {
  zone_length_m: number | null;
  bed_offset_m: number | null;
  status: string;
  crop_name: string;
  variety: string | null;
};

export type BedOption = {
  id: string;
  name: string;
  length_m: number | null;
  width_m: number | null;
  location_type: string | null;
  bed_sections: { name: string } | null;
  bed_plantings: BedPlanting[];
};

// ─── Konstanter ────────────────────────────────────────────────────────────

export const DA_MONTHS = [
  "", "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

// Plantefamilier der foretrækker varme / beskyttet miljø
export const PREFERS_WARMTH = new Set(["Natskyggefamilien", "Græskarfamilien"]);

// location_type-værdier der regnes som "varm placering" — matcher DB-constraint'en
// i bede_map_migration.sql ('friland' | 'polytunnel' | 'drivhus_opvarmet').
export const WARM_LOCATION_TYPES = new Set(["polytunnel", "drivhus_opvarmet"]);

// ─── Dato-helpers ────────────────────────────────────────────────────────────

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "long" });
}

// ─── Bed-plads-helpers ───────────────────────────────────────────────────────

export function activePlantsInBed(bed: BedOption): BedPlanting[] {
  return (bed.bed_plantings ?? []).filter(
    p => p.status !== "fjernet" && p.status !== "høstet"
  );
}

export function bedFreeM(bed: BedOption): number {
  const used = activePlantsInBed(bed).reduce((s, p) => s + (p.zone_length_m ?? 0), 0);
  return Math.max(0, Math.round(((bed.length_m ?? 0) - used) * 10) / 10);
}

export function bedFreeIntervals(bed: BedOption): { start: number; end: number }[] {
  const bedLen = bed.length_m ?? 0;
  const occupied = activePlantsInBed(bed)
    .map(p => ({ start: p.bed_offset_m ?? 0, end: (p.bed_offset_m ?? 0) + (p.zone_length_m ?? 0) }))
    .sort((a, b) => a.start - b.start);
  const free: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const z of occupied) {
    if (z.start > cursor + 0.05) free.push({ start: Math.round(cursor * 10) / 10, end: Math.round(z.start * 10) / 10 });
    cursor = Math.max(cursor, z.end);
  }
  if (cursor < bedLen - 0.05) free.push({ start: Math.round(cursor * 10) / 10, end: bedLen });
  return free;
}

export function isWarmBed(bed: BedOption): boolean {
  return !!bed.location_type && WARM_LOCATION_TYPES.has(bed.location_type);
}

export function warmLocationLabel(locationType: string | null): string {
  if (locationType === "polytunnel") return "Polytunnel";
  if (locationType === "drivhus_opvarmet") return "Opvarmet drivhus";
  return "Varm placering";
}

// Sorterer bede: varmekrævende familier foretrækker polytunnel/opvarmet drivhus,
// derefter mest ledig plads først.
export function sortBedsForFamily(beds: BedOption[], family: string | null): BedOption[] {
  const needsWarmth = family ? PREFERS_WARMTH.has(family) : false;
  return [...beds]
    .filter(b => (b.length_m ?? 0) > 0)
    .sort((a, b) => {
      if (needsWarmth) {
        const aWarm = isWarmBed(a) ? 0 : 1;
        const bWarm = isWarmBed(b) ? 0 : 1;
        if (aWarm !== bWarm) return aWarm - bWarm;
      }
      return bedFreeM(b) - bedFreeM(a);
    });
}

// ─── Udbytte- og areal-beregning ─────────────────────────────────────────────

// Foretrækker sortens egen yield_kg_per_sqm (findes i crop_varieties, mere
// præcis pr. sort) frem for det flade familie-estimat i companionPlants.ts.
export function estimateYieldKgPerPlant(
  variety: VarietyOption | null,
  family: string | null,
  rowSpacingCm: number,
  plantSpacingCm: number
): number | null {
  const min = variety?.yield_kg_per_sqm_min;
  const max = variety?.yield_kg_per_sqm_max;
  if (min != null || max != null) {
    const yieldPerSqm = ((min ?? max!) + (max ?? min!)) / 2;
    const areaPerPlantM2 = (rowSpacingCm / 100) * (plantSpacingCm / 100);
    return Math.round(yieldPerSqm * areaPerPlantM2 * 1000) / 1000;
  }
  if (family && YIELD_KG_PER_PLANT[family] != null) return YIELD_KG_PER_PLANT[family]!;
  return null;
}

// Generaliseret "ønsket kg → nødvendig zonelængde"-beregning ("Boks 3" i
// Forspiringsoverblikket), men drevet af det faktiske bedets bredde i stedet
// for et fast 1,2 m-gæt — nødvendigt når allokeringen spænder over flere bede
// med forskellig bredde.
export function requiredZoneLengthM(
  desiredKg: number,
  yieldKgPerPlant: number,
  bedWidthM: number,
  rowSpacingCm: number,
  plantSpacingCm: number
): number {
  if (!desiredKg || !yieldKgPerPlant || !rowSpacingCm || !plantSpacingCm || bedWidthM <= 0) return 0;
  const plantsNeeded = Math.ceil(desiredKg / yieldKgPerPlant);
  const rows = Math.max(1, Math.floor((bedWidthM * 100) / rowSpacingCm));
  const plantsPerRow = Math.ceil(plantsNeeded / rows);
  // Rund OP (ikke til nærmeste) — ellers kan afrunding gøre zonen en anelse
  // for kort til at rumme plantsPerRow planter, så allokeringen fejlagtigt
  // tror bedet er fyldt op og spreder en lille rest ud i et andet bed.
  return Math.ceil(plantsPerRow * (plantSpacingCm / 100) * 10) / 10;
}

// Beregner så/udplant/høst-dato midt i sortens naturlige høstvindue — samme
// logik som "Optimal periode"-forslaget i Forspiringsoverblikket.
export function computeDatesFromWindow(
  variety: VarietyOption,
  daysToHarvest: number | null,
  weeksToTransplant: number
): { sow: string; transplant: string; harvest: string; monthName: string } | null {
  if (!variety.harvest_from_month || !daysToHarvest) return null;
  const now = new Date();
  const hm = variety.harvest_from_month;
  const todayStr = today();

  const datesForYear = (year: number) => {
    const optHarvest = `${year}-${String(hm).padStart(2, "0")}-15`;
    const optTransplant = addDays(optHarvest, -daysToHarvest);
    const optSow = addDays(optTransplant, -(weeksToTransplant * 7));
    return { transplant: optTransplant, sow: optSow, harvest: optHarvest, monthName: DA_MONTHS[hm] };
  };

  let hYear = hm < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
  let result = datesForYear(hYear);
  // For langsomme afgrøder (fx løg, ~150 dage) kan høstmåneden ligge i denne
  // kalenderår uden at være passeret endnu, men den udregnede sådato ligger
  // alligevel bagud i tiden — så tjek sådatoen selv, ikke kun høstmåneden.
  if (result.sow < todayStr) {
    hYear += 1;
    result = datesForYear(hYear);
  }
  return result;
}
