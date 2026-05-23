import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import RotationPlanner from "./RotationPlanner";

export default async function PlannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  const { data: fields } = farm ? await supabase
    .from("fields")
    .select("id, name, area_ha")
    .eq("farm_id", farm.id)
    .order("name")
  : { data: [] };

  const { data: flockAnimals } = farm ? await supabase
    .from("animals")
    .select("flock_id")
    .eq("farm_id", farm.id)
    .eq("status", "active")
  : { data: [] };

  // Tæl eksisterende sektioner pr. mark
  const { data: existingSections } = farm && (fields?.length ?? 0) > 0
    ? await supabase
        .from("sections")
        .select("field_id")
        .in("field_id", fields!.map(f => f.id))
    : { data: [] };

  const sectionCountByField: Record<string, number> = {};
  for (const s of existingSections ?? []) {
    sectionCountByField[s.field_id] = (sectionCountByField[s.field_id] ?? 0) + 1;
  }

  const totalAnimals = flockAnimals?.length ?? 0;
  const month = new Date().getMonth() + 1;

  return (
    <div className="space-y-4">
      <Link href="/rotation" className="text-sm text-earth-300 flex items-center gap-1">
        ← Rotation
      </Link>

      <div>
        <h2 className="text-xl font-bold text-earth-50">Rotationsplanlægger</h2>
        <p className="text-sm text-earth-300 mt-0.5">
          Justér tallene og se hvad der virker for dit areal og din flok.
        </p>
      </div>

      <RotationPlanner
        fields={fields ?? []}
        defaultAnimals={totalAnimals || 10}
        month={month}
        farmId={farm?.id ?? ""}
        sectionCountByField={sectionCountByField}
      />
    </div>
  );
}
