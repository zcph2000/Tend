import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Rows3, Plus, Sprout } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  planlagt: "Planlagt",
  aktiv: "Aktiv",
  hvilende: "Hvilende",
};

const STATUS_COLOR: Record<string, string> = {
  planlagt: "text-earth-400",
  aktiv: "text-grass-400",
  hvilende: "text-earth-500",
};

export default async function BedePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: beds } = farm
    ? await supabase
        .from("beds")
        .select("*, bed_plantings(id, crop_name, variety, status, expected_harvest_at)")
        .eq("farm_id", farm.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const activePlantings = (beds ?? []).flatMap((b) =>
    ((b as { bed_plantings: { status: string }[] }).bed_plantings ?? []).filter(
      (p) => p.status !== "fjernet" && p.status !== "høstet"
    )
  ).length;

  return (
    <div className="space-y-4">
      <Link href="/jordbrug" className="text-sm text-earth-300 flex items-center gap-1">
        ← Jordbrug
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-earth-50">Bede</h1>
          <p className="text-sm text-earth-300 mt-0.5">
            {(beds ?? []).length === 0
              ? "Ingen bede oprettet endnu"
              : `${(beds ?? []).length} bede · ${activePlantings} aktive plantinger`}
          </p>
        </div>
        <Link href="/jordbrug/bede/ny" className="btn-primary flex items-center gap-2 px-3 py-2 text-sm">
          <Plus size={16} />
          Nyt bed
        </Link>
      </div>

      {(beds ?? []).length === 0 ? (
        <div className="card flex flex-col items-center py-10 gap-3 text-center">
          <Rows3 size={32} className="text-earth-500" />
          <div>
            <p className="text-earth-300 font-medium">Ingen bede endnu</p>
            <p className="text-xs text-earth-500 mt-0.5">
              Opret dine første bede — du kan planlægge plantinger og følge dem over tid
            </p>
          </div>
          <Link href="/jordbrug/bede/ny" className="btn-primary text-sm px-4 py-2">
            Opret første bed
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(beds ?? []).map((bed) => {
            type Planting = { id: string; crop_name: string; variety: string | null; status: string; expected_harvest_at: string | null };
            const plantings = ((bed as { bed_plantings: Planting[] }).bed_plantings ?? []).filter(
              (p) => p.status !== "fjernet"
            );
            const activePl = plantings.filter((p) => p.status !== "høstet");
            const b = bed as { id: string; name: string; area_m2: number | null; status: string; location_note: string | null; soil_notes: string | null };
            return (
              <Link key={b.id} href={`/jordbrug/bede/${b.id}`} className="card block hover:brightness-110 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Rows3 size={18} className="text-earth-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-earth-50">{b.name}</p>
                      <p className="text-xs text-earth-400 mt-0.5">
                        {b.area_m2 ? `${b.area_m2} m²` : "Areal ikke angivet"}
                        {b.location_note ? ` · ${b.location_note}` : ""}
                      </p>
                      {activePl.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {activePl.slice(0, 4).map((p) => (
                            <span key={p.id} className="text-[10px] bg-earth-800 text-earth-300 rounded-full px-2 py-0.5">
                              {p.crop_name}{p.variety ? ` · ${p.variety}` : ""}
                            </span>
                          ))}
                          {activePl.length > 4 && (
                            <span className="text-[10px] text-earth-500">+{activePl.length - 4} mere</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-medium ${STATUS_COLOR[b.status] ?? "text-earth-400"}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    {activePl.length === 0 && (
                      <span className="text-[10px] text-earth-500 flex items-center gap-1">
                        <Sprout size={10} /> Tom
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
