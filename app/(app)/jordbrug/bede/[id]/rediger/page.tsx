import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Droplets } from "lucide-react";

export default async function RedigerBedPage({ params }: { params: Promise<{ id: string }> }) {
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

  async function saveBed(data: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;

    const lengthRaw = data.get("length_m") as string;
    const widthRaw = data.get("width_m") as string;

    await supabase.from("beds").update({
      name: (data.get("name") as string).trim(),
      length_m: lengthRaw ? Number(lengthRaw) : null,
      width_m: widthRaw ? Number(widthRaw) : null,
      has_drip_irrigation: data.get("has_drip_irrigation") === "1",
      location_note: (data.get("location_note") as string) || null,
      location_type: (data.get("location_type") as string) || "friland",
      notes: (data.get("notes") as string) || null,
    }).eq("id", id).eq("farm_id", farm.id);

    redirect(`/jordbrug/bede/${id}`);
  }

  async function deleteBed() {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;
    await supabase.from("bed_plantings").delete().eq("bed_id", id);
    await supabase.from("bed_compost_applications").delete().eq("bed_id", id);
    await supabase.from("beds").delete().eq("id", id).eq("farm_id", farm.id);
    redirect("/jordbrug/bede");
  }

  const locationType = (bed as any).location_type ?? "friland";

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Rediger bed</h1>
      </div>

      <form action={saveBed} className="space-y-4">
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Grundoplysninger</h2>

          <div>
            <label className="label">Navn *</label>
            <input
              required
              name="name"
              defaultValue={bed.name}
              className="input w-full mt-1"
              placeholder="fx Tomatbed, Nordbed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Længde (m)</label>
              <input
                type="number" step="0.1" min="0"
                name="length_m"
                defaultValue={bed.length_m ?? ""}
                className="input w-full mt-1"
                placeholder="3.6"
              />
            </div>
            <div>
              <label className="label">Bredde (m)</label>
              <input
                type="number" step="0.1" min="0"
                name="width_m"
                defaultValue={bed.width_m ?? ""}
                className="input w-full mt-1"
                placeholder="1.2"
              />
            </div>
          </div>

          {/* Placering */}
          <div>
            <label className="label">Placeringstype</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {([
                { v: "friland",          l: "Friland" },
                { v: "polytunnel",       l: "Polytunnel" },
                { v: "drivhus_opvarmet", l: "Opvarmet drivhus" },
              ] as { v: string; l: string }[]).map((opt) => (
                <label
                  key={opt.v}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-colors has-[:checked]:text-white"
                  style={{
                    background: "var(--surface-raised)",
                    color: "var(--text-muted)",
                  }}
                >
                  <input
                    type="radio"
                    name="location_type"
                    value={opt.v}
                    defaultChecked={locationType === opt.v}
                    className="sr-only peer"
                  />
                  <span className="peer-checked:text-white"
                    style={{ color: "inherit" }}
                  >{opt.l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Drypvanding */}
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              name="has_drip_irrigation"
              value="1"
              defaultChecked={bed.has_drip_irrigation ?? false}
              className="sr-only peer"
            />
            <div
              className="w-10 h-6 rounded-full transition-colors peer-checked:bg-sky-500 flex-shrink-0"
              style={{ background: "var(--surface-raised)" }}
            >
              <div className="w-5 h-5 bg-white rounded-full shadow mt-0.5 ml-0.5 transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
              <Droplets size={14} />
              Drypvanding installeret
            </span>
          </label>

          <div>
            <label className="label">Placering (beskrivelse)</label>
            <input
              name="location_note"
              defaultValue={bed.location_note ?? ""}
              className="input w-full mt-1"
              placeholder="fx Sydvendt hjørne, ved laden"
            />
          </div>

          <div>
            <label className="label">Noter</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={bed.notes ?? ""}
              className="input w-full mt-1 resize-none"
              placeholder="Jordforhold, kompost osv."
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
          Sletning fjerner beddet og alle tilknyttede plantinger og kompostregistreringer. Dette kan ikke fortrydes.
        </p>
        <form action={deleteBed}>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
          >
            Slet dette bed permanent
          </button>
        </form>
      </div>
    </div>
  );
}
