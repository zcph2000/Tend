import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AddSectionForm from "./AddSectionForm";
import FenceGuide from "./FenceGuide";
import AddSoilObservationForm from "./AddSoilObservationForm";
import Link from "next/link";
import { Leaf, Worm } from "lucide-react";

const WATER_LABELS = ["Ingen", "Meget lav", "Lav", "Middel", "God", "Fremragende"];
const COMPACT_LABELS = ["Løs", "Let kompakt", "Moderat", "Kompakt", "Meget kompakt", "Beton-hård"];

function shortDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase
    .from("farms")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  const { data: field } = await supabase
    .from("fields")
    .select("*, sections(*)")
    .eq("id", id)
    .single();

  if (!field) notFound();

  // Jordsundhedsobservationer
  const { data: soilObs } = await supabase
    .from("soil_observations")
    .select("*")
    .eq("field_id", id)
    .order("observed_at", { ascending: false })
    .limit(5);

  const latest = soilObs?.[0] ?? null;

  const totalSectionArea = field.sections?.reduce(
    (sum: number, s: { area_ha: number }) => sum + (s.area_ha ?? 0), 0
  ) ?? 0;
  const remainingArea = Math.max(0, field.area_ha - totalSectionArea);

  return (
    <div className="space-y-4">
      <Link href="/pastures" className="text-sm text-earth-300 flex items-center gap-1">
        ← Marker
      </Link>

      {/* Mark-header */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-earth-50">{field.name}</h1>
            <p className="text-earth-300 text-sm mt-0.5">{field.area_ha} ha</p>
            {field.notes && (
              <p className="text-earth-300 text-sm mt-2">{field.notes}</p>
            )}
          </div>
          {field.nature_agreement && (
            <span className="flex-shrink-0 text-xs font-semibold bg-earth-800 text-earth-300 rounded-full px-2.5 py-1 mt-1 flex items-center gap-1">
              <Leaf size={11} />
              Naturpleje
            </span>
          )}
        </div>
        {field.geo_data?.soil && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <p className="text-earth-400 text-xs">Jordtype (auto)</p>
              <p className="text-earth-200 text-sm font-medium">{field.geo_data.soil.texture}</p>
            </div>
            {field.geo_data.soil.ph && (
              <div>
                <p className="text-earth-400 text-xs">pH (auto)</p>
                <p className="text-earth-200 text-sm font-medium">{field.geo_data.soil.ph.toFixed(1)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Arealoverskud */}
      {field.sections?.length > 0 && (
        <div className="card py-3">
          <div className="flex justify-between text-sm">
            <span className="text-earth-300">Fordelt i sektioner</span>
            <span className="font-medium text-earth-100">{totalSectionArea.toFixed(2)} ha</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-earth-300">Ikke-inddelt areal</span>
            <span className={`font-medium ${remainingArea > 0.01 ? "text-amber-500" : "text-earth-300"}`}>
              {remainingArea.toFixed(2)} ha
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div
              className="h-1.5 bg-earth-300 rounded-full"
              style={{ width: `${Math.min(100, (totalSectionArea / field.area_ha) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Jordsundhed */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-earth-50 flex items-center gap-2">
            <Worm size={16} className="text-earth-300" />
            Jordsundhed
          </h3>
        </div>

        {latest ? (
          <>
            <p className="text-xs text-earth-400">Seneste observation: {shortDate(latest.observed_at)}</p>
            <div className="grid grid-cols-2 gap-3">
              {latest.ph != null && (
                <div className="rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-earth-400">pH</p>
                  <p className="text-xl font-bold text-earth-50 mt-0.5">{latest.ph}</p>
                  <p className="text-xs text-earth-400 mt-0.5">
                    {latest.ph < 5.5 ? "For surt" : latest.ph <= 7.0 ? "Godt" : "For basisk"}
                  </p>
                </div>
              )}
              {latest.organic_matter_pct != null && (
                <div className="rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-earth-400">Organisk stof</p>
                  <p className="text-xl font-bold text-earth-50 mt-0.5">{latest.organic_matter_pct}%</p>
                  <p className="text-xs text-earth-400 mt-0.5">
                    {latest.organic_matter_pct < 2 ? "Lav" : latest.organic_matter_pct < 4 ? "Middel" : "God"}
                  </p>
                </div>
              )}
              {latest.earthworm_count != null && (
                <div className="rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-earth-400">Regnorme pr. m²</p>
                  <p className="text-xl font-bold text-earth-50 mt-0.5">{latest.earthworm_count}</p>
                  <p className="text-xs text-earth-400 mt-0.5">
                    {latest.earthworm_count < 10 ? "Lav aktivitet" : latest.earthworm_count < 25 ? "God" : "Fremragende"}
                  </p>
                </div>
              )}
              {latest.water_retention != null && (
                <div className="rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-earth-400">Vandretention</p>
                  <p className="text-xl font-bold text-earth-50 mt-0.5">{latest.water_retention}/5</p>
                  <p className="text-xs text-earth-400 mt-0.5">{WATER_LABELS[latest.water_retention]}</p>
                </div>
              )}
            </div>
            {latest.compaction != null && (
              <div className="rounded-xl px-3 py-2.5 border border-white/10 flex items-center justify-between">
                <span className="text-xs text-earth-300">Kompaktering</span>
                <span className="text-sm font-medium text-earth-100">
                  {latest.compaction}/5 — {COMPACT_LABELS[latest.compaction]}
                </span>
              </div>
            )}
            {latest.notes && (
              <p className="text-xs text-earth-300 italic">{latest.notes}</p>
            )}

            {/* Historik */}
            {soilObs && soilObs.length > 1 && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide">Tidligere målinger</p>
                {soilObs.slice(1).map(obs => (
                  <div key={obs.id} className="flex items-center justify-between text-xs text-earth-300">
                    <span>{shortDate(obs.observed_at)}</span>
                    <div className="flex gap-3">
                      {obs.ph != null && <span>pH {obs.ph}</span>}
                      {obs.organic_matter_pct != null && <span>OM {obs.organic_matter_pct}%</span>}
                      {obs.earthworm_count != null && <span>{obs.earthworm_count} orme</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-earth-400 text-center py-4">
            Ingen jordobservationer endnu.<br />
            <span className="text-xs">Tilføj pH, organisk stof og ormetal for at spore jordens sundhed over tid.</span>
          </p>
        )}
      </div>

      {/* Hegnsplan */}
      {field.geojson && (field.sections?.length ?? 0) >= 2 && (
        <FenceGuide
          fieldGeojson={field.geojson}
          sectionCount={field.sections.length}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        />
      )}

      {/* Tilføj sektion */}
      <AddSectionForm
        fieldId={id}
        farmId={field.farm_id}
        fieldArea={field.area_ha}
        fieldName={field.name}
        fieldGeojson={field.geojson}
        existingSections={field.sections ?? []}
        mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        farmLat={farm?.lat}
        farmLng={farm?.lng}
      />

      {/* Tilføj jordobservation */}
      <AddSoilObservationForm fieldId={id} farmId={field.farm_id} />
    </div>
  );
}
