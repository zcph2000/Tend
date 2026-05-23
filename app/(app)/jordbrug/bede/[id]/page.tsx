import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Rows3, Plus, Sprout, Pencil } from "lucide-react";
import AddPlantingForm from "./AddPlantingForm";

const STATUS_LABEL: Record<string, string> = {
  planlagt: "Planlagt",
  spiret: "Spiret",
  plantet: "Plantet ud",
  høstet: "Høstet",
  fjernet: "Fjernet",
};

const STATUS_COLOR: Record<string, string> = {
  planlagt: "text-earth-400",
  spiret: "text-earth-200",
  plantet: "text-grass-400",
  høstet: "text-earth-300",
  fjernet: "text-earth-600",
};

export default async function BedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: bed } = await supabase
    .from("beds")
    .select("*")
    .eq("id", id)
    .eq("farm_id", farm?.id ?? "")
    .single();

  if (!bed) notFound();

  const { data: plantings } = await supabase
    .from("bed_plantings")
    .select("*")
    .eq("bed_id", id)
    .order("sowed_at", { ascending: false });

  const activePlantings = (plantings ?? []).filter(
    (p) => p.status !== "fjernet" && p.status !== "høstet"
  );
  const pastPlantings = (plantings ?? []).filter(
    (p) => p.status === "høstet" || p.status === "fjernet"
  );

  async function updateStatus(data: FormData) {
    "use server";
    const supabase = await createClient();
    await supabase.from("beds").update({ status: data.get("status") }).eq("id", id);
    redirect(`/jordbrug/bede/${id}`);
  }

  return (
    <div className="space-y-4">
      <Link href="/jordbrug/bede" className="text-sm text-earth-300 flex items-center gap-1">
        ← Bede
      </Link>

      {/* Header */}
      <div className="card space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <Rows3 size={20} className="text-earth-400 flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="text-xl font-bold text-earth-50">{bed.name}</h1>
              <p className="text-sm text-earth-300 mt-0.5">
                {bed.area_m2 ? `${bed.area_m2} m²` : "Areal ikke angivet"}
                {bed.location_note ? ` · ${bed.location_note}` : ""}
              </p>
            </div>
          </div>
          <form action={updateStatus}>
            <select
              name="status"
              defaultValue={bed.status}
              onChange={() => {}}
              className="text-xs bg-earth-800 border border-white/10 rounded-lg px-2 py-1 text-earth-300"
            />
          </form>
        </div>

        <form action={updateStatus} className="flex items-center gap-2">
          <select name="status" defaultValue={bed.status}
            className="text-xs bg-earth-800 border border-white/10 rounded-lg px-2 py-1.5 text-earth-300 flex-1">
            <option value="planlagt">Planlagt</option>
            <option value="aktiv">Aktiv</option>
            <option value="hvilende">Hvilende</option>
          </select>
          <button type="submit" className="text-xs text-earth-400 hover:text-earth-200 border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            Gem status
          </button>
        </form>

        {bed.soil_notes && (
          <p className="text-xs text-earth-400 border-t border-white/5 pt-2">{bed.soil_notes}</p>
        )}
        {bed.notes && (
          <p className="text-xs text-earth-400">{bed.notes}</p>
        )}
      </div>

      {/* Aktive plantinger */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-earth-100 text-sm">Plantinger</h2>
        </div>

        {activePlantings.length === 0 ? (
          <div className="card py-6 text-center">
            <Sprout size={24} className="text-earth-600 mx-auto mb-2" />
            <p className="text-sm text-earth-400">Ingen aktive plantinger</p>
            <p className="text-xs text-earth-500 mt-0.5">Tilføj hvad du vil plante her</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activePlantings.map((p) => (
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
                      {p.row_spacing_cm && <span>{p.row_spacing_cm} cm rækkeafstand</span>}
                      {p.plant_spacing_cm && <span>{p.plant_spacing_cm} cm planteafstand</span>}
                    </div>
                    {p.companion_plants && (
                      <p className="text-xs text-earth-500 mt-1">Naboplanter: {p.companion_plants}</p>
                    )}
                    {p.notes && (
                      <p className="text-xs text-earth-500 mt-1">{p.notes}</p>
                    )}
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

      {/* Tilføj planting */}
      <AddPlantingForm bedId={id} farmId={farm?.id ?? ""} />

      {/* Historik */}
      {pastPlantings.length > 0 && (
        <div>
          <h2 className="font-semibold text-earth-100 text-sm mb-2">Historik</h2>
          <div className="space-y-2">
            {pastPlantings.map((p) => (
              <div key={p.id} className="card py-3 opacity-60">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-earth-300">
                    {p.crop_name}{p.variety ? ` · ${p.variety}` : ""}
                  </p>
                  <span className="text-xs text-earth-500">
                    {STATUS_LABEL[p.status] ?? p.status}
                    {p.harvested_at ? ` ${p.harvested_at}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
