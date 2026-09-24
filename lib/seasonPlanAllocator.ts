import { calcLayout } from "@/lib/bedPlantingLayout";
import { HARVEST_DAYS_FROM_TRANSPLANT } from "@/lib/companionPlants";
import {
  type VarietyOption,
  type BedOption,
  PREFERS_WARMTH,
  isWarmBed,
  bedFreeIntervals,
  estimateYieldKgPerPlant,
  requiredZoneLengthM,
  computeDatesFromWindow,
} from "@/lib/cropPlanning";

export type PriorityDemandRow = {
  id: string;
  variety: VarietyOption;
  desiredKg: number;
  priority: number;
};

export type AllocatedChunk = {
  bedId: string;
  bedName: string;
  offsetM: number;
  zoneLengthM: number;
};

export type AllocationResult = {
  demandRowId: string;
  requiredZoneM: number;
  allocatedZoneM: number;
  chunks: AllocatedChunk[];
  coverage: "full" | "partial" | "unmet";
  coveragePct: number;
  dates: { sow: string; transplant: string; harvest: string; monthName: string } | null;
  // Sat når "unmet" skyldes manglende udbyttedata på sorten, ikke pladsmangel —
  // UI'en skal vise en anden besked, da "hæv prioriteten" ikke hjælper her.
  noYieldData?: boolean;
};

type Interval = { start: number; end: number };

// Sorterer bede ud fra den plads der reelt er tilbage EFTER hvad tidligere
// (højere-prioriterede) afgrøder i denne allokering allerede har brugt —
// ikke kun bedets oprindelige ledige plads.
function sortByWorkingSpace(
  beds: BedOption[],
  family: string | null,
  working: Map<string, Interval[]>
): BedOption[] {
  const needsWarmth = family ? PREFERS_WARMTH.has(family) : false;
  const freeM = (bed: BedOption) =>
    (working.get(bed.id) ?? []).reduce((s, iv) => s + Math.max(0, iv.end - iv.start), 0);

  return [...beds]
    .filter(b => (b.length_m ?? 0) > 0)
    .sort((a, b) => {
      if (needsWarmth) {
        const aWarm = isWarmBed(a) ? 0 : 1;
        const bWarm = isWarmBed(b) ? 0 : 1;
        if (aWarm !== bWarm) return aWarm - bWarm;
      }
      return freeM(b) - freeM(a);
    });
}

// Grådig, prioritetsstyret allokering: højeste prioritet (laveste tal) får
// første valg af ledig plads i alle bede, før næste afgrøde overhovedet
// overvejes. Én afgrøde kan sprede sig over flere bede/intervaller hvis ét
// bed ikke rækker. Ingen succession — kun bedenes ledige plads lige nu.
export function allocateSeasonPlan(
  demand: PriorityDemandRow[],
  beds: BedOption[]
): AllocationResult[] {
  const working = new Map<string, Interval[]>();
  for (const bed of beds) {
    working.set(bed.id, bedFreeIntervals(bed).map(iv => ({ ...iv })));
  }

  const sortedDemand = [...demand].sort((a, b) => a.priority - b.priority);
  const results: AllocationResult[] = [];

  for (const row of sortedDemand) {
    const variety = row.variety;
    const family = variety.crop_species?.crop_families?.name_da ?? null;
    const rowSpacing = variety.row_spacing_cm ?? 60;
    const plantSpacing = variety.plant_spacing_cm ?? 30;
    const yieldPerPlant = estimateYieldKgPerPlant(variety, family, rowSpacing, plantSpacing);

    const daysToHarvest =
      variety.days_to_harvest_transplant ?? (family ? HARVEST_DAYS_FROM_TRANSPLANT[family] ?? null : null);
    const weeksToTransplant = variety.weeks_to_transplant ?? 6;
    const dates = computeDatesFromWindow(variety, daysToHarvest, weeksToTransplant);

    if (!yieldPerPlant) {
      results.push({
        demandRowId: row.id,
        requiredZoneM: 0,
        allocatedZoneM: 0,
        chunks: [],
        coverage: "unmet",
        coveragePct: 0,
        dates,
        noYieldData: true,
      });
      continue;
    }

    const candidateBeds = sortByWorkingSpace(beds, family, working).filter(b => {
      const intervals = working.get(b.id) ?? [];
      return intervals.some(iv => iv.end - iv.start >= 0.1);
    });

    let remainingKg = row.desiredKg;
    const chunks: AllocatedChunk[] = [];
    let totalZoneM = 0;

    for (const bed of candidateBeds) {
      if (remainingKg <= 0) break;
      const intervals = working.get(bed.id)!;
      for (const interval of intervals) {
        if (remainingKg <= 0) break;
        const availableM = interval.end - interval.start;
        if (availableM < 0.1) continue;

        const neededM = requiredZoneLengthM(remainingKg, yieldPerPlant, bed.width_m ?? 1.2, rowSpacing, plantSpacing);
        if (neededM <= 0) continue;
        const useM = Math.round(Math.min(neededM, availableM) * 10) / 10;
        if (useM < 0.1) continue;

        chunks.push({ bedId: bed.id, bedName: bed.name, offsetM: interval.start, zoneLengthM: useM });
        totalZoneM += useM;

        const plantsInChunk = calcLayout(bed.width_m ?? 1.2, {
          zoneLengthM: useM,
          rowSpacingCm: rowSpacing,
          plantSpacingCm: plantSpacing,
        }).total;
        remainingKg -= plantsInChunk * yieldPerPlant;

        interval.start = Math.round((interval.start + useM) * 10) / 10;
      }
    }

    const referenceWidth = candidateBeds[0]?.width_m ?? beds[0]?.width_m ?? 1.2;
    const requiredZoneM = requiredZoneLengthM(row.desiredKg, yieldPerPlant, referenceWidth, rowSpacing, plantSpacing);
    const coveragePct =
      row.desiredKg > 0 ? Math.max(0, Math.min(100, Math.round((1 - Math.max(0, remainingKg) / row.desiredKg) * 100))) : 100;
    const coverage: AllocationResult["coverage"] =
      remainingKg <= 0.01 ? "full" : chunks.length > 0 ? "partial" : "unmet";

    results.push({
      demandRowId: row.id,
      requiredZoneM,
      allocatedZoneM: Math.round(totalZoneM * 10) / 10,
      chunks,
      coverage,
      coveragePct,
      dates,
    });
  }

  return results;
}
