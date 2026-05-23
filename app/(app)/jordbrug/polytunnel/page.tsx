import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Wind } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { planlagt: "Planlagt", aktiv: "Aktiv", vinterhvile: "Vinterhvile" };
const STATUS_COLOR: Record<string, string> = { planlagt: "text-earth-400", aktiv: "text-grass-400", vinterhvile: "text-earth-500" };

export default async function PolytunnelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: tunnels } = farm
    ? await supabase
        .from("polytunnels")
        .select("*, polytunnel_plantings(id, crop_name, status)")
        .eq("farm_id", farm.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div className="space-y-4">
      <Link href="/jordbrug" className="text-sm text-earth-300 flex items-center gap-1">← Jordbrug</Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-earth-50">Polytunnel</h1>
          <p className="text-sm text-earth-300 mt-0.5">
            {(tunnels ?? []).length === 0 ? "Ingen polytunnels registreret" : `${(tunnels ?? []).length} polytunnel${(tunnels ?? []).length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/jordbrug/polytunnel/ny" className="btn-primary flex items-center gap-2 px-3 py-2 text-sm">
          <Plus size={16} /> Ny
        </Link>
      </div>

      {(tunnels ?? []).length === 0 ? (
        <div className="card flex flex-col items-center py-10 gap-3 text-center">
          <Wind size={32} className="text-earth-500" />
          <div>
            <p className="text-earth-300 font-medium">Ingen polytunnels endnu</p>
            <p className="text-xs text-earth-500 mt-0.5">Registrér din polytunnel og planlæg hvad der skal vokse der</p>
          </div>
          <Link href="/jordbrug/polytunnel/ny" className="btn-primary text-sm px-4 py-2">Opret polytunnel</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(tunnels ?? []).map((t) => {
            type PT = { id: string; name: string; length_m: number | null; width_m: number | null; status: string; notes: string | null; polytunnel_plantings: { id: string; crop_name: string; status: string }[] };
            const tunnel = t as unknown as PT;
            const activePl = tunnel.polytunnel_plantings.filter((p) => p.status !== "fjernet" && p.status !== "høstet");
            const area = tunnel.length_m && tunnel.width_m ? (tunnel.length_m * tunnel.width_m).toFixed(0) : null;
            return (
              <Link key={tunnel.id} href={`/jordbrug/polytunnel/${tunnel.id}`} className="card block hover:brightness-110 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Wind size={18} className="text-earth-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-earth-50">{tunnel.name}</p>
                      <p className="text-xs text-earth-400 mt-0.5">
                        {tunnel.length_m && tunnel.width_m ? `${tunnel.length_m}×${tunnel.width_m} m (${area} m²)` : "Mål ikke angivet"}
                      </p>
                      {activePl.length > 0 && (
                        <p className="text-xs text-earth-400 mt-1">{activePl.length} aktive plantinger</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${STATUS_COLOR[tunnel.status] ?? "text-earth-400"}`}>
                    {STATUS_LABEL[tunnel.status] ?? tunnel.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
