import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Wind, Plus, Sprout } from "lucide-react";
import AddPolytunnelPlantingForm from "./AddPolytunnelPlantingForm";

const STATUS_LABEL: Record<string, string> = {
  planlagt: "Planlagt", spiret: "Spiret", plantet: "Plantet ud", høstet: "Høstet", fjernet: "Fjernet",
};
const STATUS_COLOR: Record<string, string> = {
  planlagt: "text-earth-400", spiret: "text-earth-200", plantet: "text-grass-400", høstet: "text-earth-300", fjernet: "text-earth-600",
};

export default async function PolytunnelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: tunnel } = await supabase
    .from("polytunnels").select("*").eq("id", id).eq("farm_id", farm?.id ?? "").single();
  if (!tunnel) notFound();

  const { data: plantings } = await supabase
    .from("polytunnel_plantings").select("*").eq("polytunnel_id", id).order("sowed_at", { ascending: false });

  const activePl = (plantings ?? []).filter((p) => p.status !== "fjernet" && p.status !== "høstet");
  const pastPl = (plantings ?? []).filter((p) => p.status === "høstet" || p.status === "fjernet");
  const area = tunnel.length_m && tunnel.width_m ? (tunnel.length_m * tunnel.width_m).toFixed(0) : null;

  async function updateStatus(data: FormData) {
    "use server";
    const supabase = await createClient();
    await supabase.from("polytunnels").update({ status: data.get("status") }).eq("id", id);
    redirect(`/jordbrug/polytunnel/${id}`);
  }

  return (
    <div className="space-y-4">
      <Link href="/jordbrug/polytunnel" className="text-sm text-earth-300 flex items-center gap-1">← Polytunnel</Link>

      <div className="card space-y-2">
        <div className="flex items-start gap-3">
          <Wind size={20} className="text-earth-400 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-earth-50">{tunnel.name}</h1>
            <p className="text-sm text-earth-300 mt-0.5">
              {tunnel.length_m && tunnel.width_m
                ? `${tunnel.length_m} × ${tunnel.width_m} m · ${area} m²`
                : "Mål ikke angivet"}
            </p>
          </div>
        </div>
        <form action={updateStatus} className="flex items-center gap-2">
          <select name="status" defaultValue={tunnel.status}
            className="text-xs bg-earth-800 border border-white/10 rounded-lg px-2 py-1.5 text-earth-300 flex-1">
            <option value="planlagt">Planlagt</option>
            <option value="aktiv">Aktiv</option>
            <option value="vinterhvile">Vinterhvile</option>
          </select>
          <button type="submit" className="text-xs text-earth-400 hover:text-earth-200 border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            Gem
          </button>
        </form>
        {tunnel.notes && <p className="text-xs text-earth-400 border-t border-white/5 pt-2">{tunnel.notes}</p>}
      </div>

      <div>
        <h2 className="font-semibold text-earth-100 text-sm mb-2">Plantinger</h2>
        {activePl.length === 0 ? (
          <div className="card py-6 text-center">
            <Sprout size={24} className="text-earth-600 mx-auto mb-2" />
            <p className="text-sm text-earth-400">Ingen aktive plantinger</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activePl.map((p) => (
              <div key={p.id} className="card py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-earth-100">
                      {p.crop_name}{p.variety ? <span className="text-earth-400 font-normal"> · {p.variety}</span> : null}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-earth-400">
                      {p.sowed_at && <span>Sået {p.sowed_at}</span>}
                      {p.transplanted_at && <span>Plantet {p.transplanted_at}</span>}
                      {p.expected_harvest_at && <span>Høst ca. {p.expected_harvest_at}</span>}
                      {p.quantity_plants && <span>{p.quantity_plants} planter</span>}
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
        )}
      </div>

      <AddPolytunnelPlantingForm polytunnelId={id} farmId={farm?.id ?? ""} />

      {pastPl.length > 0 && (
        <div>
          <h2 className="font-semibold text-earth-100 text-sm mb-2">Historik</h2>
          <div className="space-y-2">
            {pastPl.map((p) => (
              <div key={p.id} className="card py-3 opacity-60">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-earth-300">{p.crop_name}{p.variety ? ` · ${p.variety}` : ""}</p>
                  <span className="text-xs text-earth-500">{STATUS_LABEL[p.status] ?? p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
