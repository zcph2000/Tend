import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function RedigerPolytunnelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: tunnel } = await supabase
    .from("polytunnels")
    .select("*")
    .eq("id", id)
    .eq("farm_id", farm?.id ?? "")
    .single();

  if (!tunnel) notFound();

  async function saveTunnel(data: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;

    const lengthRaw = data.get("length_m") as string;
    const widthRaw = data.get("width_m") as string;

    await supabase.from("polytunnels").update({
      name: (data.get("name") as string).trim(),
      length_m: lengthRaw ? Number(lengthRaw) : null,
      width_m: widthRaw ? Number(widthRaw) : null,
      status: (data.get("status") as string) || "planlagt",
      notes: (data.get("notes") as string) || null,
    }).eq("id", id).eq("farm_id", farm.id);

    redirect(`/farming/polytunnel/${id}`);
  }

  async function deleteTunnel() {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;
    await supabase.from("polytunnel_plantings").delete().eq("polytunnel_id", id);
    await supabase.from("polytunnels").delete().eq("id", id).eq("farm_id", farm.id);
    redirect("/farming/polytunnel");
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Rediger polytunnel</h1>
      </div>

      <form action={saveTunnel} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Navn *</label>
            <input
              required
              name="name"
              defaultValue={tunnel.name}
              className="input w-full mt-1"
              placeholder="Polytunnel 1, Vinterdrivhuset..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Længde (m)</label>
              <input
                type="number" step="0.5" min="0"
                name="length_m"
                defaultValue={tunnel.length_m ?? ""}
                className="input w-full mt-1"
                placeholder="20"
              />
            </div>
            <div>
              <label className="label">Bredde (m)</label>
              <input
                type="number" step="0.5" min="0"
                name="width_m"
                defaultValue={tunnel.width_m ?? ""}
                className="input w-full mt-1"
                placeholder="6"
              />
            </div>
          </div>

          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={tunnel.status} className="input w-full mt-1">
              <option value="planlagt">Planlagt</option>
              <option value="aktiv">Aktiv</option>
              <option value="vinterhvile">Vinterhvile</option>
            </select>
          </div>

          <div>
            <label className="label">Noter</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={tunnel.notes ?? ""}
              className="input w-full mt-1 resize-none"
              placeholder="Konstruktionstype, placering, formål..."
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          Gem ændringer
        </button>
      </form>

      {/* Slet */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">Farezone</h2>
        <p className="text-xs text-earth-500 mb-3">
          Sletning fjerner polytunnellen og alle tilknyttede plantinger. Dette kan ikke fortrydes.
        </p>
        <form action={deleteTunnel}>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
          >
            Slet denne polytunnel permanent
          </button>
        </form>
      </div>
    </div>
  );
}
