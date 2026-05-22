import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AddSectionForm from "./AddSectionForm";
import FenceGuide from "./FenceGuide";

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

  const totalSectionArea = field.sections?.reduce(
    (sum: number, s: { area_ha: number }) => sum + (s.area_ha ?? 0), 0
  ) ?? 0;
  const remainingArea = Math.max(0, field.area_ha - totalSectionArea);

  return (
    <div className="space-y-4">
      {/* Mark-header */}
      <div className="card bg-gradient-to-br from-earth-700 to-earth-900 text-white border-0">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{field.name}</h1>
          {field.nature_agreement && (
            <span className="flex-shrink-0 text-xs font-semibold bg-grass-600 text-white rounded-full px-2.5 py-1 mt-1">
              🌿 Naturpleje
            </span>
          )}
        </div>
        <p className="text-earth-300 mt-1">{field.area_ha} ha i alt</p>
        {field.notes && (
          <p className="text-earth-400 text-sm mt-2">{field.notes}</p>
        )}
        {/* Jordbundsdata */}
        {field.geo_data?.soil && (
          <div className="mt-3 pt-3 border-t border-earth-600 grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <p className="text-earth-400 text-xs">Jordtype</p>
              <p className="text-earth-100 text-sm font-medium">{field.geo_data.soil.texture}</p>
            </div>
            {field.geo_data.soil.ph && (
              <div>
                <p className="text-earth-400 text-xs">pH</p>
                <p className="text-earth-100 text-sm font-medium">{field.geo_data.soil.ph.toFixed(1)}</p>
              </div>
            )}
            {field.geo_data.elevation?.elevation_m && (
              <div>
                <p className="text-earth-400 text-xs">Højde</p>
                <p className="text-earth-100 text-sm font-medium">{field.geo_data.elevation.elevation_m} m</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Arealoverskud */}
      {field.sections?.length > 0 && (
        <div className="card py-3">
          <div className="flex justify-between text-sm">
            <span className="text-earth-500">Fordelt i sektioner</span>
            <span className="font-medium text-earth-800">{totalSectionArea.toFixed(2)} ha</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-earth-500">Ikke-inddelt areal</span>
            <span className={`font-medium ${remainingArea > 0 ? "text-amber-600" : "text-grass-600"}`}>
              {remainingArea.toFixed(2)} ha
            </span>
          </div>
          <div className="w-full bg-earth-100 rounded-full h-2 mt-2">
            <div
              className="h-2 bg-grass-500 rounded-full"
              style={{ width: `${Math.min(100, (totalSectionArea / field.area_ha) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Hegnsplan — kun hvis marken er tegnet og har sektioner */}
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
    </div>
  );
}
