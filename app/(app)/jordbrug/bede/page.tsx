import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Rows3, Compass, Sprout, ChevronRight, Droplets } from "lucide-react";

function orientationLabel(deg: number | null) {
  if (deg === null) return null;
  const d = ((deg % 180) + 180) % 180;
  if (d < 22) return "N–S";
  if (d < 67) return "NØ–SV";
  if (d < 112) return "Ø–V";
  return "SØ–NV";
}

function fmtShort(date: string) {
  return new Date(date).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

function bedArea(b: { length_m: number | null; width_m: number | null; area_m2: number | null }) {
  if (b.length_m && b.width_m) return `${b.length_m}×${b.width_m} m`;
  if (b.area_m2) return `${b.area_m2} m²`;
  return null;
}

type Planting = {
  id: string;
  crop_name: string;
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

type Section = {
  id: string;
  name: string;
  orientation_degrees: number | null;
  location_notes: string | null;
  beds: Bed[];
};

export default async function BedePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const plantingSelect = `id, crop_name, status, expected_harvest_at`;
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
          href="/jordbrug/bede/ny"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Plus size={15} />
          Nyt bed
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
        <div className="space-y-3">
          {/* Sektioner — ét kort pr. sektion */}
          {allSections.map((section) => {
            const activePlantings = section.beds
              .flatMap(b => b.bed_plantings)
              .filter(p => p.status !== "fjernet" && p.status !== "høstet");
            const nextHarvest = activePlantings
              .map(p => p.expected_harvest_at)
              .filter((d): d is string => !!d)
              .sort()[0] ?? null;
            const totalArea = section.beds.reduce((sum, b) => {
              if (b.length_m && b.width_m) return sum + b.length_m * b.width_m;
              if (b.area_m2) return sum + b.area_m2;
              return sum;
            }, 0);

            return (
              <Link
                key={section.id}
                href={`/jordbrug/bede/sektion/${section.id}`}
                className="flex items-start gap-4 p-4 rounded-2xl hover:brightness-110 transition-all group"
                style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(99,107,60,0.25)" }}
                >
                  <Rows3 size={18} className="text-earth-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-earth-50">{section.name}</p>
                    {orientationLabel(section.orientation_degrees) && (
                      <span className="flex items-center gap-0.5 text-[10px] text-earth-500">
                        <Compass size={9} />{orientationLabel(section.orientation_degrees)}
                      </span>
                    )}
                  </div>
                  {section.location_notes && (
                    <p className="text-xs text-earth-500 mt-0.5">{section.location_notes}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
                      {section.beds.length} {section.beds.length === 1 ? "bed" : "bede"}
                    </span>
                    {totalArea > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
                        {totalArea.toFixed(0)} m²
                      </span>
                    )}
                    {activePlantings.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(163,230,53,0.08)", color: "#a3e635" }}>
                        <Sprout size={9} className="inline mr-0.5" />
                        {activePlantings.length} aktive
                      </span>
                    )}
                    {nextHarvest && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(163,230,53,0.08)", color: "#a3e635" }}>
                        Høst {fmtShort(nextHarvest)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-earth-500 group-hover:text-earth-200 transition-colors flex-shrink-0 mt-1" />
              </Link>
            );
          })}

          {/* Bede uden sektion */}
          {allOrphan.length > 0 && (
            <div>
              {allSections.length > 0 && (
                <p className="text-xs font-semibold text-earth-500 uppercase tracking-widest px-1 mb-2 mt-4">
                  Øvrige bede
                </p>
              )}
              <div className="space-y-2">
                {allOrphan.map((bed) => {
                  const active = bed.bed_plantings.filter(p => p.status !== "fjernet" && p.status !== "høstet");
                  const nextHarvest = active.map(p => p.expected_harvest_at).filter((d): d is string => !!d).sort()[0] ?? null;
                  const area = bedArea(bed);
                  return (
                    <Link
                      key={bed.id}
                      href={`/jordbrug/bede/${bed.id}`}
                      className="flex items-start gap-3 p-4 rounded-xl hover:brightness-110 transition-all"
                      style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <Rows3 size={15} className="text-earth-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-earth-100 text-sm">{bed.name}</span>
                          {bed.has_drip_irrigation && <Droplets size={11} className="text-sky-400" />}
                          {nextHarvest && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto"
                              style={{ background: "rgba(163,230,53,0.1)", color: "#a3e635" }}>
                              Høst {fmtShort(nextHarvest)}
                            </span>
                          )}
                        </div>
                        {area && <p className="text-[11px] text-earth-500 mt-0.5">{area}</p>}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
