import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Rows3, Compass, Droplets, Sprout, Pencil, Sun, Wind, CalendarDays } from "lucide-react";
import AddPlantingForm from "./AddPlantingForm";
import PlantingPlannerForm from "./PlantingPlannerForm";
import BedLayoutSVG from "./BedLayoutSVG";
import PlantingCard, { type PlantingCardData } from "./PlantingCard";
import KompostForm from "./KompostForm";
import { zoneColor, type PlantingZone } from "@/lib/bedPlantingLayout";

const MONTHS = ["","Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

function orientationLabel(deg: number | null) {
  if (deg === null) return null;
  const d = ((deg % 180) + 180) % 180;
  if (d < 22) return "N–S";
  if (d < 67) return "NØ–SV";
  if (d < 112) return "Ø–V";
  return "SØ–NV";
}

function fmt(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

// Sædskifte-farver pr. familie
const FAMILY_COLORS: Record<string, string> = {
  "Natskyggefamilien":  "rgba(239,68,68,0.15)",
  "Korsblomstfamilien": "rgba(251,191,36,0.15)",
  "Skærmblomstfamilien":"rgba(34,197,94,0.12)",
  "Ærtefamilien":       "rgba(56,189,248,0.15)",
  "Græskarfamilien":    "rgba(249,115,22,0.15)",
  "Rosenfamilien":      "rgba(236,72,153,0.12)",
  "Amarantfamilien":    "rgba(168,85,247,0.12)",
  "Løgfamilien":        "rgba(234,179,8,0.15)",
  "Kurvblomstfamilien": "rgba(16,185,129,0.12)",
};

export default async function BedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  const { data: bed } = await supabase
    .from("beds")
    .select(`
      *,
      bed_sections ( name, orientation_degrees )
    `)
    .eq("id", id)
    .eq("farm_id", farm?.id ?? "")
    .single();

  if (!bed) notFound();

  const [{ data: plantings }, { data: compostLog }, { data: varieties }] = await Promise.all([
    supabase.from("bed_plantings")
      .select(`
        *,
        crop_varieties (
          name,
          days_to_harvest_transplant,
          weeks_to_transplant,
          crop_species ( name_da, crop_families ( name_da, scientific_name ) )
        )
      `)
      .eq("bed_id", id)
      .order("sowed_at", { ascending: false, nullsFirst: false }),
    supabase.from("bed_compost_applications")
      .select("*")
      .eq("bed_id", id)
      .order("applied_date", { ascending: false }),
    supabase.from("crop_varieties")
      .select(`id, name, days_to_harvest_transplant, weeks_to_transplant,
               harvest_from_month, harvest_to_month, row_spacing_cm, plant_spacing_cm,
               crop_species ( name_da, crop_families ( name_da ) )`)
      .order("name"),
  ]);

  const active = (plantings ?? []).filter(p => p.status !== "fjernet" && p.status !== "høstet");
  const past   = (plantings ?? []).filter(p => p.status === "høstet" || p.status === "fjernet");

  const nextHarvest = active
    .map(p => p.expected_harvest_at)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null;

  const bedLengthM = bed.length_m ?? 0;
  const bedWidthM  = bed.width_m  ?? 0;

  // Byg PlantingZone[] til SVG og formular
  const activeZones: PlantingZone[] = active.map((p, i) => {
    const family = (p as any).crop_varieties?.crop_species?.crop_families?.name_da ?? null;
    return {
      id: p.id,
      cropName: p.crop_name,
      varietyName: (p as any).variety ?? null,
      family,
      offsetM: (p as any).bed_offset_m ?? 0,
      zoneLengthM: (p as any).zone_length_m ?? bedLengthM,
      rowSpacingCm: (p as any).row_spacing_cm ?? null,
      plantSpacingCm: (p as any).plant_spacing_cm ?? null,
    };
  });

  // Sædskiftehistorik: grupper aktive og historiske plantinger efter sæson + familie
  const familyBySeason = new Map<number, Set<string>>();
  for (const p of plantings ?? []) {
    const family = (p.crop_varieties as any)?.crop_species?.crop_families?.name_da;
    if (!family) continue;
    const season = p.season ?? new Date(p.sowed_at ?? p.transplanted_at ?? "").getFullYear();
    if (!season || isNaN(season)) continue;
    if (!familyBySeason.has(season)) familyBySeason.set(season, new Set());
    familyBySeason.get(season)!.add(family);
  }
  const sortedSeasons = [...familyBySeason.entries()].sort((a, b) => b[0] - a[0]);

  // Advarsel: samme familie to år i træk
  const familyWarnings: string[] = [];
  const seasonList = [...familyBySeason.entries()].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < seasonList.length; i++) {
    const prev = seasonList[i - 1][1];
    const curr = seasonList[i][1];
    for (const f of curr) {
      if (prev.has(f)) familyWarnings.push(`${f} i ${seasonList[i][0]} og ${seasonList[i-1][0]}`);
    }
  }

  const section = (bed as any).bed_sections as { name: string; orientation_degrees: number | null } | null;
  const effOrientation = bed.orientation_degrees ?? section?.orientation_degrees ?? null;
  const area = bed.length_m && bed.width_m
    ? `${bed.length_m}×${bed.width_m} m (${(bed.length_m * bed.width_m).toFixed(1)} m²)`
    : bed.area_m2 ? `${bed.area_m2} m²` : null;

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-start gap-3">
          <Rows3 size={20} className="text-earth-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-earth-50">{bed.name}</h1>
            {section && (
              <p className="text-xs text-earth-500 mt-0.5">{section.name}</p>
            )}
          </div>
          <Link
            href={`/jordbrug/bede/${id}/rediger`}
            className="p-2 rounded-lg flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-subtle)" }}
          >
            <Pencil size={16} />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {area && (
            <span className="px-2 py-1 rounded-lg" style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
              {area}
            </span>
          )}
          {orientationLabel(effOrientation) && (
            <span className="px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
              <Compass size={10} />{orientationLabel(effOrientation)}
              {orientationLabel(effOrientation) === "N–S" && (
                <span className="text-[10px] text-earth-500 ml-1">· høje afgrøder mod nord</span>
              )}
            </span>
          )}
          {bed.has_drip_irrigation && (
            <span className="px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8" }}>
              <Droplets size={10} />Drypvanding
            </span>
          )}
          {(bed as any).location_type && (bed as any).location_type !== "friland" && (
            <span className="px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
              {(bed as any).location_type === "polytunnel" ? <Wind size={10} /> : <Sun size={10} />}
              {(bed as any).location_type === "polytunnel" ? "Polytunnel" : "Opvarmet drivhus"}
            </span>
          )}
          {nextHarvest && (
            <span className="px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(163,230,53,0.1)", color: "#a3e635" }}>
              <CalendarDays size={10} />Høst ca. {fmt(nextHarvest)}
            </span>
          )}
        </div>
        {bed.location_note && (
          <p className="text-xs text-earth-500 border-t border-white/5 pt-2">{bed.location_note}</p>
        )}
        {bed.notes && (
          <p className="text-xs text-earth-500">{bed.notes}</p>
        )}
      </div>

      {/* Bed-layout SVG */}
      {bedLengthM > 0 && bedWidthM > 0 && (
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">
            Bedvisning
          </h2>
          {activeZones.length > 0 ? (
            <BedLayoutSVG
              bedLengthM={bedLengthM}
              bedWidthM={bedWidthM}
              zones={activeZones}
            />
          ) : (
            <p className="text-xs text-earth-600">Ingen aktive plantinger endnu</p>
          )}
          {activeZones.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeZones.map(z => (
                <span key={z.id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: `${zoneColor(z.family)}22`, color: zoneColor(z.family) }}>
                  ● {z.cropName}{z.varietyName ? ` · ${z.varietyName}` : ""}
                  {z.rowSpacingCm && z.plantSpacingCm && (
                    <span style={{ opacity: 0.7 }}> · {z.rowSpacingCm}×{z.plantSpacingCm} cm</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sædskiftehistorik */}
      {sortedSeasons.length > 0 && (
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Sædskifte</h2>
          {familyWarnings.length > 0 && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
              ⚠ Samme familie to år i træk: {familyWarnings.join(", ")}
            </div>
          )}
          <div className="space-y-1.5">
            {sortedSeasons.map(([season, families]) => (
              <div key={season} className="flex items-start gap-2">
                <span className="text-xs text-earth-500 w-10 flex-shrink-0 pt-0.5">{season}</span>
                <div className="flex flex-wrap gap-1">
                  {[...families].map((f) => (
                    <span
                      key={f}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: FAMILY_COLORS[f] ?? "var(--surface-raised)", color: "var(--text-muted)" }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktive plantinger */}
      <div>
        <h2 className="font-semibold text-earth-100 text-sm mb-2 px-1">
          Plantinger
          {active.length > 0 && <span className="text-earth-500 font-normal ml-1">({active.length})</span>}
        </h2>
        {active.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ border: "1px dashed rgba(255,255,255,0.1)" }}
          >
            <Sprout size={20} className="text-earth-600 mx-auto mb-2" />
            <p className="text-xs text-earth-500">Ingen aktive plantinger</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((p) => (
              <PlantingCard
                key={p.id}
                planting={p as unknown as PlantingCardData}
                bedLengthM={bedLengthM}
                bedWidthM={bedWidthM}
                allActiveZones={activeZones}
              />
            ))}
          </div>
        )}
      </div>

      {/* Planlæg forspiring */}
      <PlantingPlannerForm
        bedId={id}
        farmId={farm?.id ?? ""}
        bedLengthM={bedLengthM}
        bedWidthM={bedWidthM}
        varieties={(varieties as any) ?? []}
        existingZones={activeZones}
      />

      {/* Tilføj planting (registrér hvad der allerede er sket) */}
      <AddPlantingForm
        bedId={id}
        farmId={farm?.id ?? ""}
        bedLengthM={bedLengthM}
        bedWidthM={bedWidthM}
        varieties={(varieties as any) ?? []}
        existingZones={activeZones}
      />

      {/* Kompost-log */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Kompost og jordopbygning</h2>

        {(compostLog ?? []).length > 0 && (
          <div className="space-y-1.5">
            {compostLog!.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-xs border-b border-white/5 pb-1.5 last:border-0">
                <span className="text-earth-500 w-16 flex-shrink-0">{fmt(c.applied_date)}</span>
                <div className="flex-1">
                  <span className="text-earth-200">{c.source ?? "Kompost"}</span>
                  {c.amount_description && <span className="text-earth-500"> · {c.amount_description}</span>}
                  {c.notes && <p className="text-earth-600 mt-0.5">{c.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <KompostForm bedId={id} farmId={farm?.id ?? ""} />
      </div>

      {/* Historik */}
      {past.length > 0 && (
        <div>
          <h2 className="font-semibold text-earth-100 text-sm mb-2 px-1">Historik</h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {past.map((p, i) => {
              const family = (p as any).crop_varieties?.crop_species?.crop_families?.name_da;
              const isLast = i === past.length - 1;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: "var(--surface)",
                    borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                    opacity: 0.65,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-earth-300">
                      {p.crop_name}{p.variety ? ` · ${p.variety}` : ""}
                    </span>
                    {family && (
                      <span className="text-[10px] text-earth-500 ml-2">{family}</span>
                    )}
                    {p.season && <span className="text-[10px] text-earth-600 ml-2">{p.season}</span>}
                  </div>
                  <span className="text-xs text-earth-600 flex-shrink-0">
                    {p.status === "høstet" ? "Høstet" : "Fjernet"}
                    {p.harvested_at ? ` ${fmt(p.harvested_at)}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

