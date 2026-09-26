import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Apple } from "lucide-react";
import AddFruitPlantForm from "./AddFruitPlantForm";

const TYPE_LABEL: Record<string, string> = {
  træ: "Træ", busk: "Busk", bærplante: "Bærplante", slyngplante: "Slyngplante", andet: "Andet",
};
const STATUS_LABEL: Record<string, string> = { planlagt: "Planlagt", etableret: "Etableret", producerer: "Producerer" };
const STATUS_COLOR: Record<string, string> = {
  planlagt: "text-earth-400", etableret: "text-earth-300", producerer: "text-grass-400",
};

export default async function FrugtplantagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const [{ data: plants }, { data: varieties }] = await Promise.all([
    farm
      ? supabase.from("fruit_plants").select("*").eq("farm_id", farm.id).order("plant_type").order("name")
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("crop_varieties")
      .select("id, name, crop_species(name_da, crop_families(name_da))")
      .order("name"),
  ]);

  const byType: Record<string, typeof plants> = {};
  for (const p of plants ?? []) {
    const t = (p.plant_type as string) ?? "andet";
    byType[t] = [...(byType[t] ?? []), p];
  }

  return (
    <div className="space-y-4">
      <Link href="/farming" className="text-sm text-earth-300 flex items-center gap-1">← Jordbrug</Link>

      <div>
        <h1 className="text-xl font-bold text-earth-50">Frugtplantage</h1>
        <p className="text-sm text-earth-300 mt-0.5">
          {(plants ?? []).length === 0 ? "Ingen flerårige planter registreret" : `${(plants ?? []).length} planter registreret`}
        </p>
      </div>

      {Object.entries(byType).map(([type, group]) => (
        <div key={type}>
          <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide mb-2">{TYPE_LABEL[type] ?? type}</p>
          <div className="space-y-2">
            {(group ?? []).map((p) => (
              <Link key={p.id} href={`/farming/orchard/${p.id}`} className="card py-3 block hover:brightness-110 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-earth-100">
                      {p.name}
                      {p.variety ? <span className="text-earth-400 font-normal"> · {p.variety}</span> : null}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-earth-400">
                      {p.quantity && p.quantity > 1 && <span>{p.quantity} stk</span>}
                      {p.planted_year && <span>Plantet {p.planted_year}</span>}
                      {p.location_note && <span>{p.location_note}</span>}
                    </div>
                    {p.notes && <p className="text-xs text-earth-500 mt-1">{p.notes}</p>}
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${STATUS_COLOR[p.status] ?? "text-earth-400"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {(plants ?? []).length === 0 && (
        <div className="card flex flex-col items-center py-10 gap-3 text-center">
          <Apple size={32} className="text-earth-500" />
          <div>
            <p className="text-earth-300 font-medium">Ingen planter endnu</p>
            <p className="text-xs text-earth-500 mt-0.5">Registrér dine frugttræer, bærbuske og flerårige planter</p>
          </div>
        </div>
      )}

      <AddFruitPlantForm farmId={farm?.id ?? ""} varieties={(varieties as any) ?? []} />
    </div>
  );
}
