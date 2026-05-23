import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sprout, Plus } from "lucide-react";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export default async function FroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: seeds } = farm
    ? await supabase.from("seeds").select("*").eq("farm_id", farm.id).order("crop_name")
    : { data: [] };

  const currentMonth = new Date().getMonth() + 1;
  const sowableNow = (seeds ?? []).filter(
    (s) => s.sowing_from_month && s.sowing_to_month &&
      currentMonth >= s.sowing_from_month && currentMonth <= s.sowing_to_month
  );

  async function addSeed(data: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;
    const crop_name = data.get("crop_name") as string;
    if (!crop_name?.trim()) return;
    await supabase.from("seeds").insert({
      farm_id: farm.id,
      crop_name: crop_name.trim(),
      variety: (data.get("variety") as string) || null,
      supplier: (data.get("supplier") as string) || null,
      quantity_g: data.get("quantity_g") ? Number(data.get("quantity_g")) : null,
      quantity_seeds: data.get("quantity_seeds") ? Number(data.get("quantity_seeds")) : null,
      purchased_at: (data.get("purchased_at") as string) || null,
      best_before_year: data.get("best_before_year") ? Number(data.get("best_before_year")) : null,
      germination_rate_pct: data.get("germination_rate_pct") ? Number(data.get("germination_rate_pct")) : null,
      sowing_from_month: data.get("sowing_from_month") ? Number(data.get("sowing_from_month")) : null,
      sowing_to_month: data.get("sowing_to_month") ? Number(data.get("sowing_to_month")) : null,
      notes: (data.get("notes") as string) || null,
    });
    redirect("/jordbrug/fro");
  }

  return (
    <div className="space-y-4">
      <Link href="/jordbrug" className="text-sm text-earth-300 flex items-center gap-1">← Jordbrug</Link>

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

      {/* Tilføj frø */}
      <details className="group">
        <summary className="w-full flex items-center justify-center gap-2 border border-dashed border-earth-700 rounded-xl py-3 text-sm text-earth-400 hover:border-earth-500 hover:text-earth-300 transition-colors cursor-pointer list-none">
          <Plus size={16} /> Tilføj frø til lager
        </summary>
        <form action={addSeed} className="card mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Afgrøde *</label>
              <input name="crop_name" required className="input w-full mt-1" placeholder="Tomat, Gulerod..." />
            </div>
            <div>
              <label className="label">Sort</label>
              <input name="variety" className="input w-full mt-1" placeholder="Brandywine..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mængde (g)</label>
              <input name="quantity_g" type="number" step="0.1" min="0" className="input w-full mt-1" placeholder="5" />
            </div>
            <div>
              <label className="label">Antal frø</label>
              <input name="quantity_seeds" type="number" min="0" className="input w-full mt-1" placeholder="200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Leverandør</label>
              <input name="supplier" className="input w-full mt-1" placeholder="Frøsamlerne..." />
            </div>
            <div>
              <label className="label">Bedst før (år)</label>
              <input name="best_before_year" type="number" min="2020" max="2040" className="input w-full mt-1" placeholder="2027" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Såes fra måned</label>
              <select name="sowing_from_month" className="input w-full mt-1">
                <option value="">—</option>
                {MONTHS.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Såes til måned</label>
              <select name="sowing_to_month" className="input w-full mt-1">
                <option value="">—</option>
                {MONTHS.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Spiringsprocent</label>
            <input name="germination_rate_pct" type="number" min="0" max="100" className="input w-full mt-1" placeholder="85" />
          </div>
          <div>
            <label className="label">Noter</label>
            <textarea name="notes" rows={2} className="input w-full mt-1 resize-none" placeholder="Forspiring 6–8 uger inden udplantning..." />
          </div>
          <button type="submit" className="btn-primary w-full">Tilføj frø</button>
        </form>
      </details>

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
