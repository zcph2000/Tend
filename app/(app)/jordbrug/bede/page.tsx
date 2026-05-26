import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Rows3, Sprout, Droplets, Compass, Map, Trash2 } from "lucide-react";

function orientationLabel(deg: number | null) {
  if (deg === null) return null;
  const d = ((deg % 180) + 180) % 180;
  if (d < 22) return "N–S";
  if (d < 67) return "NØ–SV";
  if (d < 112) return "Ø–V";
  return "SØ–NV";
}

function bedArea(b: { length_m: number | null; width_m: number | null; area_m2: number | null }) {
  if (b.length_m && b.width_m) return `${b.length_m}×${b.width_m} m`;
  if (b.area_m2) return `${b.area_m2} m²`;
  return null;
}

type Planting = {
  id: string;
  crop_name: string;
  variety: string | null;
  status: string;
  zone_description: string | null;
  expected_harvest_at: string | null;
};

type Bed = {
  id: string;
  name: string;
  length_m: number | null;
  width_m: number | null;
  area_m2: number | null;
  orientation_degrees: number | null;
  has_drip_irrigation: boolean;
  status: string;
  bed_plantings: Planting[];
};

type Section = {
  id: string;
  name: string;
  orientation_degrees: number | null;
  location_notes: string | null;
  beds: Bed[];
};

async function deleteSection(sectionId: string) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
  if (!farm) return;
  await supabase.from("bed_sections").delete().eq("id", sectionId).eq("farm_id", farm.id);
  redirect("/jordbrug/bede");
}

export default async function BedePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const plantingSelect = `id, crop_name, variety, status, zone_description, expected_harvest_at`;
  const bedSelect = `id, name, length_m, width_m, area_m2, orientation_degrees, has_drip_irrigation, status, bed_plantings (${plantingSelect})`;

  const [{ data: sections }, { data: orphanBeds }] = await Promise.all([
    farm
      ? supabase.from("bed_sections")
          .select(`id, name, location_notes, orientation_degrees, beds (${bedSelect})`)
          .eq("farm_id", farm.id)
          .order("created_at")
      : { data: [] },
    farm
      ? supabase.from("beds")
          .select(bedSelect)
          .eq("farm_id", farm.id)
          .is("section_id", null)
          .order("created_at")
      : { data: [] },
  ]);

  const allSections = (sections ?? []) as Section[];
  const allOrphan = (orphanBeds ?? []) as Bed[];
  const totalBeds = allSections.reduce((n, s) => n + s.beds.length, 0) + allOrphan.length;
  const totalActive = [...allSections.flatMap(s => s.beds), ...allOrphan]
    .flatMap(b => b.bed_plantings)
    .filter(p => p.status !== "fjernet" && p.status !== "høstet").length;

  const isEmpty = totalBeds === 0;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-earth-50">Bede</h1>
          <p className="text-sm text-earth-300 mt-0.5">
            {isEmpty
              ? "Ingen bede endnu"
              : `${totalBeds} ${totalBeds === 1 ? "bed" : "bede"} · ${totalActive} aktive plantinger`}
          </p>
        </div>
        <Link
          href="/jordbrug/bede/kort"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Map size={15} />
          Kort
        </Link>
      </div>

      {isEmpty ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center text-center gap-3"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Rows3 size={32} className="text-earth-600" />
          <div>
            <p className="font-medium text-earth-200">Ingen bede endnu</p>
            <p className="text-xs text-earth-500 mt-1 leading-relaxed">
              Opret din første sektion og tilføj permanente no-dig bede med plantningshistorik
            </p>
          </div>
          <Link href="/jordbrug/bede/ny" className="btn-primary text-sm px-4 py-2 mt-1">
            Opret første bed
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sektioner */}
          {allSections.map((section) => (
            <div key={section.id}>
              {/* Sektionshoved */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <h2 className="font-bold text-earth-100">{section.name}</h2>
                {orientationLabel(section.orientation_degrees) && (
                  <span className="flex items-center gap-1 text-[10px] text-earth-500">
                    <Compass size={10} />
                    {orientationLabel(section.orientation_degrees)}
                  </span>
                )}
                {section.location_notes && (
                  <span className="text-[10px] text-earth-600 truncate">{section.location_notes}</span>
                )}
                <span className="ml-auto text-[10px] text-earth-600">
                  {section.beds.length} {section.beds.length === 1 ? "bed" : "bede"}
                </span>
              </div>

              {section.beds.length === 0 ? (
                <div
                  className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ border: "1px dashed rgba(255,255,255,0.1)" }}
                >
                  <p className="text-xs text-earth-500">Tom sektion — ingen bede endnu</p>
                  <form action={deleteSection.bind(null, section.id)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors"
                      style={{ color: "#f87171", background: "rgba(239,68,68,0.1)" }}
                    >
                      <Trash2 size={11} />Slet
                    </button>
                  </form>
                </div>
              ) : (
                <BedList beds={section.beds} />
              )}
            </div>
          ))}

          {/* Bede uden sektion */}
          {allOrphan.length > 0 && (
            <div>
              {allSections.length > 0 && (
                <h2 className="font-bold text-earth-100 mb-2 px-1">Øvrige bede</h2>
              )}
              <BedList beds={allOrphan} />
            </div>
          )}
        </div>
      )}

      <Link
        href="/jordbrug/bede/ny"
        className="btn-primary fixed bottom-20 right-4 flex items-center gap-2 shadow-lg z-10"
      >
        <Plus size={18} />
        Nyt bed
      </Link>
    </div>
  );
}

function fmtShort(date: string) {
  return new Date(date).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

function BedList({ beds }: { beds: Bed[] }) {
  return (
    <div className="space-y-2">
      {beds.map((bed) => {
        const active = bed.bed_plantings.filter(p => p.status !== "fjernet" && p.status !== "høstet");
        const area = bedArea(bed);
        const ori = orientationLabel(bed.orientation_degrees);
        const nextHarvest = active
          .map(p => p.expected_harvest_at)
          .filter((d): d is string => !!d)
          .sort()[0] ?? null;
        return (
          <Link
            key={bed.id}
            href={`/jordbrug/bede/${bed.id}`}
            className="flex items-start gap-3 p-4 rounded-xl hover:brightness-110 transition-all"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Rows3 size={16} className="text-earth-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-earth-100 text-sm">{bed.name}</span>
                {bed.has_drip_irrigation && (
                  <Droplets size={11} className="text-sky-400 flex-shrink-0" />
                )}
                {nextHarvest && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto flex-shrink-0"
                    style={{ background: "rgba(163,230,53,0.1)", color: "#a3e635" }}>
                    Høst {fmtShort(nextHarvest)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-earth-500">
                {area && <span>{area}</span>}
                {ori && (
                  <>
                    {area && <span>·</span>}
                    <span className="flex items-center gap-0.5">
                      <Compass size={9} />{ori}
                    </span>
                  </>
                )}
              </div>
              {active.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {active.slice(0, 5).map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
                    >
                      {p.crop_name}{p.variety ? ` · ${p.variety}` : ""}
                    </span>
                  ))}
                  {active.length > 5 && (
                    <span className="text-[10px] text-earth-500">+{active.length - 5}</span>
                  )}
                </div>
              )}
              {active.length === 0 && (
                <span className="text-[10px] text-earth-600 flex items-center gap-1 mt-1">
                  <Sprout size={9} /> Tomt
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
