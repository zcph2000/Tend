import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Rows3, Sprout, Droplets, Compass, ChevronLeft, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";

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

function fmtShort(date: string) {
  return new Date(date).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

type Planting = {
  id: string;
  crop_name: string;
  variety: string | null;
  status: string;
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

async function deleteSection(sectionId: string) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
  if (!farm) return;
  await supabase.from("bed_sections").delete().eq("id", sectionId).eq("farm_id", farm.id);
  redirect("/farming/beds");
}

export default async function SectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const plantingSelect = `id, crop_name, variety, status, expected_harvest_at`;
  const bedSelect = `id, name, length_m, width_m, area_m2, orientation_degrees, has_drip_irrigation, status, bed_plantings (${plantingSelect})`;

  const { data: section } = await supabase
    .from("bed_sections")
    .select(`id, name, location_notes, orientation_degrees, beds (${bedSelect})`)
    .eq("id", id)
    .eq("farm_id", farm?.id ?? "")
    .single();

  if (!section) notFound();

  const beds = (section.beds ?? []) as Bed[];
  const activePlantings = beds.flatMap(b => b.bed_plantings)
    .filter(p => p.status !== "fjernet" && p.status !== "høstet");

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <Link href="/farming/beds" className="flex items-center gap-1 text-xs text-earth-500 mb-3 hover:text-earth-300 transition-colors">
          <ChevronLeft size={13} />
          Alle sektioner
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-earth-50">{section.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-earth-400">
              {orientationLabel(section.orientation_degrees) && (
                <span className="flex items-center gap-1">
                  <Compass size={11} />{orientationLabel(section.orientation_degrees)}
                </span>
              )}
              {section.location_notes && (
                <span>{section.location_notes}</span>
              )}
              <span>{beds.length} {beds.length === 1 ? "bed" : "bede"} · {activePlantings.length} aktive plantinger</span>
            </div>
          </div>
          {beds.length === 0 && (
            <form action={deleteSection.bind(null, section.id)}>
              <button type="submit"
                className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: "#f87171", background: "rgba(239,68,68,0.1)" }}>
                <Trash2 size={11} />Slet sektion
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Bede */}
      {beds.length === 0 ? (
        <div className="rounded-xl p-8 flex flex-col items-center text-center gap-3"
          style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
          <Rows3 size={28} className="text-earth-600" />
          <div>
            <p className="text-sm font-medium text-earth-300">Tom sektion</p>
            <p className="text-xs text-earth-500 mt-1">Opret dit første bed i {section.name}</p>
          </div>
        </div>
      ) : (
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
                href={`/farming/beds/${bed.id}`}
                className="flex items-start gap-3 p-4 rounded-xl hover:brightness-110 transition-all"
                style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Rows3 size={16} className="text-earth-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-earth-100 text-sm">{bed.name}</span>
                    {bed.has_drip_irrigation && <Droplets size={11} className="text-sky-400 flex-shrink-0" />}
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
                        <span className="flex items-center gap-0.5"><Compass size={9} />{ori}</span>
                      </>
                    )}
                  </div>
                  {active.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {active.slice(0, 5).map((p) => (
                        <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
                          {p.crop_name}{p.variety ? ` · ${p.variety}` : ""}
                        </span>
                      ))}
                      {active.length > 5 && (
                        <span className="text-[10px] text-earth-500">+{active.length - 5}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-earth-600 flex items-center gap-1 mt-1">
                      <Sprout size={9} /> Tomt
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href={`/farming/beds/new?section=${section.id}`}
        className="btn-primary fixed bottom-20 right-4 flex items-center gap-2 shadow-lg z-10"
      >
        <Plus size={18} />
        Nyt bed
      </Link>
    </div>
  );
}
