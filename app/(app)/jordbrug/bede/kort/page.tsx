import { createClient } from "@/lib/supabase/server";
import BedSectionMap from "./BedSectionMap";

export default async function BedKortPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase
    .from("farms")
    .select("id, lat, lng")
    .eq("user_id", user!.id)
    .single();

  const { data: sections } = farm
    ? await supabase
        .from("bed_sections")
        .select(`
          id, name, center_lat, center_lng,
          orientation_degrees, bed_count, bed_length_m, bed_width_m, path_width_m,
          beds ( id, name )
        `)
        .eq("farm_id", farm.id)
        .order("created_at")
    : { data: [] };

  const farmLat = (farm as any)?.lat ?? 55.75;
  const farmLng = (farm as any)?.lng ?? 11.0;

  return (
    <div className="space-y-0 -mx-4 -mt-4">
      <BedSectionMap
        farmId={farm?.id ?? ""}
        farmLat={farmLat}
        farmLng={farmLng}
        sections={(sections as any) ?? []}
        mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
      />
    </div>
  );
}
