import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function NytBedPage() {
  async function createBed(data: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;

    const name = data.get("name") as string;
    if (!name?.trim()) return;

    const { data: bed } = await supabase.from("beds").insert({
      farm_id: farm.id,
      name: name.trim(),
      area_m2: data.get("area_m2") ? Number(data.get("area_m2")) : null,
      location_note: (data.get("location_note") as string) || null,
      soil_notes: (data.get("soil_notes") as string) || null,
      status: (data.get("status") as string) || "planlagt",
      notes: (data.get("notes") as string) || null,
    }).select("id").single();

    if (bed) redirect(`/jordbrug/bede/${bed.id}`);
    else redirect("/jordbrug/bede");
  }

  return (
    <div className="space-y-4">
      <Link href="/jordbrug/bede" className="text-sm text-earth-300 flex items-center gap-1">
        ← Bede
      </Link>

      <div>
        <h1 className="text-xl font-bold text-earth-50">Nyt bed</h1>
        <p className="text-sm text-earth-300 mt-0.5">Opret et nyt bed eller vækstareal</p>
      </div>

      <form action={createBed} className="space-y-4">
        <div className="card space-y-4">

          <div>
            <label className="label">Navn *</label>
            <input name="name" required className="input w-full mt-1" placeholder="f.eks. Bed 1, Nordbed, Tomatbed" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Areal (m²)</label>
              <input name="area_m2" type="number" step="0.1" min="0" className="input w-full mt-1" placeholder="12" />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" className="input w-full mt-1">
                <option value="planlagt">Planlagt</option>
                <option value="aktiv">Aktiv</option>
                <option value="hvilende">Hvilende</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Placering</label>
            <input name="location_note" className="input w-full mt-1" placeholder="f.eks. Sydvendt hjørne, ved stalden" />
          </div>

          <div>
            <label className="label">Jordforhold / kompost</label>
            <input name="soil_notes" className="input w-full mt-1" placeholder="f.eks. Tilsat 5 cm kompost, sandblandet muldjord" />
          </div>

          <div>
            <label className="label">Noter</label>
            <textarea name="notes" rows={3} className="input w-full mt-1 resize-none" placeholder="Yderligere noter om dette bed" />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          Opret bed
        </button>
      </form>
    </div>
  );
}
