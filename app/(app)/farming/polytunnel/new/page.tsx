import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function NyPolytunnelPage() {
  async function create(data: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;
    const name = data.get("name") as string;
    if (!name?.trim()) return;
    const { data: t } = await supabase.from("polytunnels").insert({
      farm_id: farm.id,
      name: name.trim(),
      length_m: data.get("length_m") ? Number(data.get("length_m")) : null,
      width_m: data.get("width_m") ? Number(data.get("width_m")) : null,
      status: (data.get("status") as string) || "planlagt",
      notes: (data.get("notes") as string) || null,
    }).select("id").single();
    if (t) redirect(`/farming/polytunnel/${t.id}`);
    else redirect("/farming/polytunnel");
  }

  return (
    <div className="space-y-4">
      <Link href="/farming/polytunnel" className="text-sm text-earth-300 flex items-center gap-1">← Polytunnel</Link>
      <div>
        <h1 className="text-xl font-bold text-earth-50">Ny polytunnel</h1>
        <p className="text-sm text-earth-300 mt-0.5">Registrér en ny polytunnel eller drivhus</p>
      </div>
      <form action={create} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Navn *</label>
            <input name="name" required className="input w-full mt-1" placeholder="Polytunnel 1, Vinterdrivhuset..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Længde (m)</label>
              <input name="length_m" type="number" step="0.5" min="0" className="input w-full mt-1" placeholder="20" />
            </div>
            <div>
              <label className="label">Bredde (m)</label>
              <input name="width_m" type="number" step="0.5" min="0" className="input w-full mt-1" placeholder="6" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input w-full mt-1">
              <option value="planlagt">Planlagt</option>
              <option value="aktiv">Aktiv</option>
              <option value="vinterhvile">Vinterhvile</option>
            </select>
          </div>
          <div>
            <label className="label">Noter</label>
            <textarea name="notes" rows={3} className="input w-full mt-1 resize-none" placeholder="Konstruktionstype, placering, formål..." />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full">Opret polytunnel</button>
      </form>
    </div>
  );
}
