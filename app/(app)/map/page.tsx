import { createClient } from "@/lib/supabase/server";
import FarmOverviewMap from "@/components/FarmOverviewMap";

export default async function FarmMapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase
    .from("farms")
    .select("id, lat, lng")
    .eq("user_id", user!.id)
    .single();

  const [
    { data: fields },
    { data: paddockRows },
    { data: activeGrazing },
    { data: bedSectionRows },
    { data: bedRows },
    { data: polytunnelRows },
  ] = farm
    ? await Promise.all([
        supabase
          .from("fields")
          .select("id, name, geojson, area_ha")
          .eq("farm_id", farm.id)
          .not("geojson", "is", null),
        supabase
          .from("sections")
          .select("id, field_id, name, area_ha, geojson")
          .eq("farm_id", farm.id)
          .not("geojson", "is", null),
        supabase
          .from("grazing_records")
          .select("section_id")
          .eq("farm_id", farm.id)
          .is("end_date", null),
        supabase
          .from("bed_sections")
          .select("id, name, center_lat, center_lng, orientation_degrees, bed_count, bed_length_m, bed_width_m, path_width_m")
          .eq("farm_id", farm.id)
          .not("center_lat", "is", null),
        supabase
          .from("beds")
          .select("id, name, center_lat, center_lng, orientation_degrees, length_m, width_m")
          .eq("farm_id", farm.id)
          .is("section_id", null)
          .not("center_lat", "is", null),
        supabase
          .from("polytunnels")
          .select("id, name, center_lat, center_lng, orientation_degrees, length_m, width_m")
          .eq("farm_id", farm.id)
          .not("center_lat", "is", null),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const activeSectionIds = new Set((activeGrazing ?? []).map((g) => g.section_id));
  const paddocks = (paddockRows ?? []).map((p) => ({
    ...p,
    active: activeSectionIds.has(p.id),
  }));

  const farmLat = (farm as any)?.lat ?? 55.75;
  const farmLng = (farm as any)?.lng ?? 11.0;

  return (
    <div className="space-y-0 -mx-4 -mt-4">
      <FarmOverviewMap
        farmLat={farmLat}
        farmLng={farmLng}
        fields={(fields as any) ?? []}
        paddocks={(paddocks as any) ?? []}
        bedSections={(bedSectionRows as any) ?? []}
        beds={(bedRows as any) ?? []}
        polytunnels={(polytunnelRows as any) ?? []}
        mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
      />
    </div>
  );
}
