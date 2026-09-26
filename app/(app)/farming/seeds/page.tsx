import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Sprout } from "lucide-react";
import AddSeedForm from "./AddSeedForm";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export default async function FroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const [{ data: seeds }, { data: varieties }] = await Promise.all([
    farm
      ? supabase.from("seeds").select("*").eq("farm_id", farm.id).order("crop_name")
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("crop_varieties")
      .select(`id, name, direct_sow, sow_indoor_from_month, sow_indoor_to_month,
                direct_sow_from_month, direct_sow_to_month,
                crop_species(name_da, crop_families(name_da))`)
      .order("name"),
  ]);

  const currentMonth = new Date().getMonth() + 1;
  const sowableNow = (seeds ?? []).filter(
    (s) => s.sowing_from_month && s.sowing_to_month &&
      currentMonth >= s.sowing_from_month && currentMonth <= s.sowing_to_month
  );

  return (
    <div className="space-y-4">
      <Link href="/farming" className="text-sm text-earth-300 flex items-center gap-1">← Jordbrug</Link>

      <div>
        <h1 className="text-xl font-bold text-earth-50">Frø og forspiring</h1>
        <p className="text-sm text-earth-300 mt-0.5">
          {(seeds ?? []).length === 0 ? "Ingen frø registreret" : `${(seeds ?? []).length} frøtyper i lageret`}
          {sowableNow.length > 0 ? ` · ${sowableNow.length} kan sås nu` : ""}
        </p>
      </div>

      {/* Kan sås nu */}
      {sowableNow.length > 0 && (
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-earth-300 uppercase tracking-wide">Kan sås nu ({MONTHS[currentMonth]})</p>
          <div className="space-y-1">
            {sowableNow.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <p className="text-sm text-earth-100">
                  {s.crop_name}{s.variety ? <span className="text-earth-400"> · {s.variety}</span> : null}
                </p>
                <span className="text-xs text-earth-400">
                  {MONTHS[s.sowing_from_month]}–{MONTHS[s.sowing_to_month]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lager */}
      {(seeds ?? []).length > 0 && (
        <div>
          <h2 className="font-semibold text-earth-100 text-sm mb-2">Frølager</h2>
          <div className="space-y-2">
            {(seeds ?? []).map((s) => (
              <div key={s.id} className="card py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-earth-100">
                      {s.crop_name}
                      {s.variety ? <span className="text-earth-400 font-normal"> · {s.variety}</span> : null}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-earth-400">
                      {s.quantity_g && <span>{s.quantity_g} g</span>}
                      {s.quantity_seeds && <span>{s.quantity_seeds} frø</span>}
                      {s.supplier && <span>{s.supplier}</span>}
                      {s.best_before_year && <span>Bedst før {s.best_before_year}</span>}
                      {s.germination_rate_pct && <span>{s.germination_rate_pct}% spiring</span>}
                      {s.sowing_from_month && s.sowing_to_month && (
                        <span>Såes {MONTHS[s.sowing_from_month]}–{MONTHS[s.sowing_to_month]}</span>
                      )}
                    </div>
                    {s.notes && <p className="text-xs text-earth-500 mt-1">{s.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddSeedForm farmId={farm?.id ?? ""} varieties={(varieties as any) ?? []} />

      {(seeds ?? []).length === 0 && sowableNow.length === 0 && (
        <div className="card flex flex-col items-center py-10 gap-3 text-center">
          <Sprout size={32} className="text-earth-500" />
          <div>
            <p className="text-earth-300 font-medium">Ingen frø registreret</p>
            <p className="text-xs text-earth-500 mt-0.5">Opret dit frølager så rådgiveren ved hvad du har til rådighed</p>
          </div>
        </div>
      )}
    </div>
  );
}
