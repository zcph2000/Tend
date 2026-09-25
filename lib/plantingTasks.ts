import type { SupabaseClient } from "@supabase/supabase-js";
import { getEstimatedMinutes, getEstimatedSeedCost } from "@/lib/taskTimeEstimates";
import { toISODate } from "@/lib/calendarEvents";

export type PlantingStatus = "planlagt" | "spiret" | "plantet" | "høstet";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type PlantingTaskInput = {
  farmId: string;
  bedPlantingId: string | null;
  cropName: string;
  varietyName: string | null;
  varietyId: string | null;
  bedName?: string | null;
  status: PlantingStatus;
  seedsToBuy: number | null;
  sowDate: string | null;
  transplantDate: string | null;
  harvestDate: string | null;
};

/**
 * Bygger de kalenderopgaver (køb/sæt til at spire/udplant/høst) der hører
 * til en plantning — status-bevidst, så kun trin der reelt ligger foran én
 * bliver oprettet (fx ingen "køb frø" hvis plantningen logges som allerede
 * spiret). Bruges af Dyrkningsguiden, Sæsonplan og "Tilføj plantning", så
 * logikken kun findes ét sted. Opgaverne får et vindue (due_date_end) i
 * stedet for at være låst til én bestemt dag, undtagen hvor det ikke giver
 * mening (fx såning, der reelt sker på en ret præcis dag).
 */
export async function buildPlantingTaskRows(
  supabase: SupabaseClient,
  input: PlantingTaskInput
): Promise<Record<string, unknown>[]> {
  const { farmId, bedPlantingId, cropName, varietyName, bedName, status, seedsToBuy, sowDate, transplantDate, harvestDate } = input;
  const label = varietyName ? `${cropName} · ${varietyName}` : cropName;
  const suffix = bedName ? ` — ${bedName}` : "";
  const todayStr = toISODate(new Date());

  const includeBuy = status === "planlagt" && !!seedsToBuy;
  const includeSow = status === "planlagt" && !!sowDate;
  const includeTransplant = (status === "planlagt" || status === "spiret") && !!transplantDate;
  const includeHarvest = status !== "høstet" && !!harvestDate;

  const [sowEst, transplantEst, harvestEst, buyEst] = await Promise.all([
    includeSow ? getEstimatedMinutes(supabase, farmId, "såning") : Promise.resolve(null),
    includeTransplant ? getEstimatedMinutes(supabase, farmId, "udplantning") : Promise.resolve(null),
    includeHarvest ? getEstimatedMinutes(supabase, farmId, "høst") : Promise.resolve(null),
    includeBuy ? getEstimatedSeedCost(supabase, farmId, input.varietyId) : Promise.resolve(null),
  ]);

  const tasks: Record<string, unknown>[] = [];

  if (includeBuy) {
    const deadline = sowDate ?? transplantDate!;
    const dueEnd = addDays(deadline, -2);
    tasks.push({
      farm_id: farmId,
      title: `Køb ${seedsToBuy} frø — ${label}`,
      due_date: todayStr,
      due_date_end: dueEnd > todayStr ? dueEnd : todayStr,
      category: "økonomi",
      timing_type: "exact",
      source_type: "planting",
      bed_planting_id: bedPlantingId,
      task_type: "indkøb",
      estimated_cost_dkk: buyEst,
    });
  }

  if (includeSow) {
    tasks.push({
      farm_id: farmId,
      title: `Sæt ${cropName} til at spire`,
      due_date: sowDate,
      due_date_end: addDays(sowDate!, 2),
      category: "jordbrug",
      timing_type: "exact",
      source_type: "planting",
      bed_planting_id: bedPlantingId,
      task_type: "såning",
      estimated_minutes: sowEst,
    });
  }

  if (includeTransplant) {
    tasks.push({
      farm_id: farmId,
      title: `Udplant ${label}${suffix}`,
      due_date: transplantDate,
      due_date_end: addDays(transplantDate!, 3),
      category: "jordbrug",
      timing_type: "exact",
      source_type: "planting",
      bed_planting_id: bedPlantingId,
      task_type: "udplantning",
      estimated_minutes: transplantEst,
    });
  }

  if (includeHarvest) {
    tasks.push({
      farm_id: farmId,
      title: `Høst ${label}${suffix}`,
      due_date: harvestDate,
      due_date_end: addDays(harvestDate!, 7),
      category: "jordbrug",
      timing_type: "exact",
      source_type: "planting",
      bed_planting_id: bedPlantingId,
      task_type: "høst",
      estimated_minutes: harvestEst,
    });
  }

  return tasks;
}
