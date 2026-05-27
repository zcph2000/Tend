import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import AfgrodeList from "./AfgrodeList";

export default async function AfgroderPage() {
  const supabase = await createClient();

  const { data: varieties } = await supabase
    .from("crop_varieties")
    .select(`
      id, name, heritage, variety_type, description,
      direct_sow, indoor_propagation,
      harvest_from_month, harvest_to_month,
      sun_requirements, frost_hardy, polytunnel_benefit,
      crop_species (
        name_da, plant_type,
        crop_families ( name_da )
      )
    `)
    .order("name");

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-earth-50">Afgrødedatabase</h1>
          <p className="text-earth-300 text-sm mt-0.5">
            {varieties?.length ?? 0} sorter · Kalibreret til dansk klima, zone 7b
          </p>
        </div>
      </div>

      <AfgrodeList varieties={(varieties as any) ?? []} />

      <Link
        href="/farming/crops/new"
        className="btn-primary fixed bottom-20 right-4 flex items-center gap-2 shadow-lg z-10"
      >
        <Plus size={18} />
        Tilføj sort
      </Link>
    </div>
  );
}
