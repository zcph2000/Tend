import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ForspiringsTool from "./ForspiringsTool";

export default async function ForspiringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const [{ data: varieties }, { data: beds }] = await Promise.all([
    supabase
      .from("crop_varieties")
      .select(`id, name, days_to_harvest_transplant, weeks_to_transplant,
               harvest_from_month, harvest_to_month, row_spacing_cm, plant_spacing_cm,
               crop_species ( name_da, crop_families ( name_da ) )`)
      .order("name"),
    supabase
      .from("beds")
      .select(`
        id, name, length_m, width_m, location_type,
        bed_sections ( name ),
        bed_plantings ( zone_length_m, bed_offset_m, status, crop_name, variety )
      `)
      .eq("farm_id", farm.id)
      .order("name"),
  ]);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/tools" className="text-earth-500 hover:text-earth-300 transition-colors p-1 -ml-1">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-earth-50">Forspiringsoverblik</h1>
          <p className="text-sm text-earth-300 mt-0.5">Planlæg hvad du vil dyrke og hvornår</p>
        </div>
      </div>
      <ForspiringsTool
        farmId={farm.id}
        varieties={(varieties as any) ?? []}
        beds={(beds as any) ?? []}
      />
    </div>
  );
}
