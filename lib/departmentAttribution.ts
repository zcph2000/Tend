import type { SupabaseClient } from "@supabase/supabase-js";

export type DepartmentResolvers = {
  deptForFlockId: (flockId: string | null) => string | null;
  deptForPlantingId: (plantingId: string | null) => string | null;
  deptForExpense: (e: { department_id: string | null; flock_id: string | null }) => string | null;
};

/**
 * Henter og bygger de tre afslag der bruges til at afgøre hvilken afdeling en
 * given udgift/høstlog/dyrelog/opgave hører til. Delt mellem Regnskab- og
 * Budget-siderne så afdelingslogikken kun findes ét sted.
 */
export async function buildDepartmentResolvers(
  supabase: SupabaseClient,
  farmId: string
): Promise<DepartmentResolvers> {
  const [{ data: flockRows }, { data: deptSpeciesLinks }, { data: plantings }] = await Promise.all([
    supabase.from("flocks").select("id, department_id").eq("farm_id", farmId),
    supabase.from("department_species_links").select("species_id, department_id").eq("farm_id", farmId),
    supabase.from("bed_plantings").select("id, crop_varieties(species_id)").eq("farm_id", farmId),
  ]);

  const flockDept: Record<string, string> = {};
  for (const f of flockRows ?? []) if (f.department_id) flockDept[f.id] = f.department_id;

  const speciesDept: Record<string, string> = {};
  for (const l of deptSpeciesLinks ?? []) speciesDept[l.species_id] = l.department_id;

  const plantingDept: Record<string, string> = {};
  for (const p of plantings ?? []) {
    const speciesId = (p.crop_varieties as unknown as { species_id: string } | null)?.species_id;
    if (speciesId && speciesDept[speciesId]) plantingDept[p.id] = speciesDept[speciesId];
  }

  return {
    deptForFlockId: (flockId) => (flockId ? flockDept[flockId] ?? null : null),
    deptForPlantingId: (plantingId) => (plantingId ? plantingDept[plantingId] ?? null : null),
    deptForExpense: (e) => e.department_id ?? (e.flock_id ? flockDept[e.flock_id] ?? null : null),
  };
}
