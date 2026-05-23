import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Apple, Plus } from "lucide-react";

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

  const { data: plants } = farm
    ? await supabase.from("fruit_plants").select("*").eq("farm_id", farm.id).order("plant_type").order("name")
    : { data: [] };

  const byType: Record<string, typeof plants> = {};
  for (const p of plants ?? []) {
    const t = (p.plant_type as string) ?? "andet";
    byType[t] = [...(byType[t] ?? []), p];
  }

  async function addPlant(data: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;
    const name = data.get("name") as string;
    if (!name?.trim()) return;
    await supabase.from("fruit_plants").insert({
      farm_id: farm.id,
      name: name.trim(),
      plant_type: (data.get("plant_type") as string) || "træ",
      species: (data.get("species") as string) || null,
      variety: (data.get("variety") as string) || null,
      planted_year: data.get("planted_year") ? Number(data.get("planted_year")) : null,
      quantity: data.get("quantity") ? Number(data.get("quantity")) : 1,
      location_note: (data.get("location_note") as string) || null,
      status: (data.get("status") as string) || "planlagt",
      notes: (data.get("notes") as string) || null,
    });
    redirect("/jordbrug/frugtplantage");
  }

  return (
    <div className="space-y-4">
      <Link href="/jordbrug" className="text-sm text-earth-300 flex items-center gap-1">← Jordbrug</Link>

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
              <div key={p.id} className="card py-3">
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
              </div>
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

      <details className="group">
        <summary className="w-full flex items-center justify-center gap-2 border border-dashed border-earth-700 rounded-xl py-3 text-sm text-earth-400 hover:border-earth-500 hover:text-earth-300 transition-colors cursor-pointer list-none">
          <Plus size={16} /> Tilføj plante
        </summary>
        <form action={addPlant} className="card mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Navn *</label>
              <input name="name" required className="input w-full mt-1" placeholder="Æbletræ, Ribs, Humle..." />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="plant_type" className="input w-full mt-1">
                <option value="træ">Træ</option>
                <option value="busk">Busk</option>
                <option value="bærplante">Bærplante</option>
                <option value="slyngplante">Slyngplante</option>
                <option value="andet">Andet</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Art</label>
              <input name="species" className="input w-full mt-1" placeholder="Malus domestica..." />
            </div>
            <div>
              <label className="label">Sort</label>
              <input name="variety" className="input w-full mt-1" placeholder="Cox Orange..." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Antal</label>
              <input name="quantity" type="number" min="1" defaultValue="1" className="input w-full mt-1" />
            </div>
            <div>
              <label className="label">Plantet år</label>
              <input name="planted_year" type="number" min="1900" max="2040" className="input w-full mt-1" placeholder="2025" />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" className="input w-full mt-1">
                <option value="planlagt">Planlagt</option>
                <option value="etableret">Etableret</option>
                <option value="producerer">Producerer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Placering</label>
            <input name="location_note" className="input w-full mt-1" placeholder="Sydmuren, langs hegnet..." />
          </div>
          <div>
            <label className="label">Noter</label>
            <textarea name="notes" rows={2} className="input w-full mt-1 resize-none" placeholder="Bestøvningspartner, særlige behov..." />
          </div>
          <button type="submit" className="btn-primary w-full">Tilføj plante</button>
        </form>
      </details>
    </div>
  );
}
