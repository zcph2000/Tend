import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlaskConical, Plus } from "lucide-react";

const TYPE_LABEL: Record<string, string> = { varmt: "Varm kompost", koldt: "Kold kompost", orm: "Ormekasse", bokashi: "Bokashi" };
const STATUS_LABEL: Record<string, string> = { planlagt: "Planlagt", aktiv: "Aktiv", klar: "Klar til brug", brugt: "Anvendt" };
const STATUS_COLOR: Record<string, string> = {
  planlagt: "text-earth-500", aktiv: "text-earth-300", klar: "text-grass-400", brugt: "text-earth-600",
};

export default async function KompostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: heaps } = farm
    ? await supabase.from("compost_heaps").select("*").eq("farm_id", farm.id).order("created_at")
    : { data: [] };

  const readyHeaps = (heaps ?? []).filter((h) => h.status === "klar");

  async function addHeap(data: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;
    const name = data.get("name") as string;
    if (!name?.trim()) return;
    await supabase.from("compost_heaps").insert({
      farm_id: farm.id,
      name: name.trim(),
      type: (data.get("type") as string) || "koldt",
      started_at: (data.get("started_at") as string) || null,
      ready_at: (data.get("ready_at") as string) || null,
      status: (data.get("status") as string) || "aktiv",
      notes: (data.get("notes") as string) || null,
    });
    redirect("/farming/compost");
  }

  return (
    <div className="space-y-4">
      <Link href="/farming" className="text-sm text-earth-300 flex items-center gap-1">← Jordbrug</Link>

      <div>
        <h1 className="text-xl font-bold text-earth-50">Kompost</h1>
        <p className="text-sm text-earth-300 mt-0.5">
          {(heaps ?? []).length === 0 ? "Ingen kompostbunker registreret" : `${(heaps ?? []).length} bunker`}
          {readyHeaps.length > 0 ? ` · ${readyHeaps.length} klar til brug` : ""}
        </p>
      </div>

      {(heaps ?? []).length > 0 && (
        <div className="space-y-2">
          {(heaps ?? []).map((h) => (
            <div key={h.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <FlaskConical size={18} className="text-earth-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-earth-50">{h.name}</p>
                    <p className="text-xs text-earth-400 mt-0.5">{TYPE_LABEL[h.type] ?? h.type}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-earth-400">
                      {h.started_at && <span>Startet {h.started_at}</span>}
                      {h.ready_at && <span>Klar ca. {h.ready_at}</span>}
                    </div>
                    {h.notes && <p className="text-xs text-earth-500 mt-1">{h.notes}</p>}
                  </div>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${STATUS_COLOR[h.status] ?? "text-earth-400"}`}>
                  {STATUS_LABEL[h.status] ?? h.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(heaps ?? []).length === 0 && (
        <div className="card flex flex-col items-center py-10 gap-3 text-center">
          <FlaskConical size={32} className="text-earth-500" />
          <div>
            <p className="text-earth-300 font-medium">Ingen kompostbunker endnu</p>
            <p className="text-xs text-earth-500 mt-0.5">Registrér dine bunker og hold styr på hvornår de er klar</p>
          </div>
        </div>
      )}

      <details className="group">
        <summary className="w-full flex items-center justify-center gap-2 border border-dashed border-earth-700 rounded-xl py-3 text-sm text-earth-400 hover:border-earth-500 hover:text-earth-300 transition-colors cursor-pointer list-none">
          <Plus size={16} /> Tilføj kompostbunke
        </summary>
        <form action={addHeap} className="card mt-3 space-y-3">
          <div>
            <label className="label">Navn *</label>
            <input name="name" required className="input w-full mt-1" placeholder="Kompost 1, Varm bunke..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select name="type" className="input w-full mt-1">
                <option value="koldt">Kold kompost</option>
                <option value="varmt">Varm kompost</option>
                <option value="orm">Ormekasse</option>
                <option value="bokashi">Bokashi</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" className="input w-full mt-1">
                <option value="planlagt">Planlagt</option>
                <option value="aktiv">Aktiv</option>
                <option value="klar">Klar til brug</option>
                <option value="brugt">Anvendt</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Startet</label>
              <input name="started_at" type="date" className="input w-full mt-1" />
            </div>
            <div>
              <label className="label">Klar ca.</label>
              <input name="ready_at" type="date" className="input w-full mt-1" />
            </div>
          </div>
          <div>
            <label className="label">Noter</label>
            <textarea name="notes" rows={2} className="input w-full mt-1 resize-none" placeholder="Indhold, placering..." />
          </div>
          <button type="submit" className="btn-primary w-full">Tilføj bunke</button>
        </form>
      </details>
    </div>
  );
}
