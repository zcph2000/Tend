import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AddFieldForm from "./AddFieldForm";
import { Map, Maximize2, LayoutGrid } from "lucide-react";

export default async function PasturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  const { data: fields } = farm
    ? await supabase
        .from("fields")
        .select("*, sections(*)")
        .eq("farm_id", farm.id)
        .order("name")
    : { data: [] };

  const totalHa = fields?.reduce((sum, f) => sum + (f.area_ha ?? 0), 0) ?? 0;
  const totalSections = fields?.reduce(
    (sum, f) => sum + (f.sections?.length ?? 0),
    0
  ) ?? 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Marker",      value: fields?.length ?? 0,       Icon: Map },
          { label: "Total areal", value: `${totalHa.toFixed(1)} ha`, Icon: Maximize2 },
          { label: "Sektioner",   value: totalSections,              Icon: LayoutGrid },
        ].map((s) => (
          <div key={s.label} className="card text-center py-3">
            <s.Icon size={18} className="text-earth-200 mx-auto" />
            <p className="text-lg font-bold text-earth-50 leading-tight mt-1">
              {s.value}
            </p>
            <p className="text-xs text-earth-200 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Fields list */}
      {fields && fields.length > 0 ? (
        <div className="space-y-3">
          {fields.map((field) => (
            <Link key={field.id} href={`/farming/pastures/${field.id}`} className="card block hover:brightness-110 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-earth-50">{field.name}</h3>
                  <p className="text-earth-300 text-sm">
                    {field.area_ha} ha · {field.sections?.length ?? 0} sektioner
                  </p>
                </div>
                <span className="text-earth-200 text-lg">→</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8">
          <div className="flex justify-center mb-3"><Map size={36} className="text-earth-400" /></div>
          <p className="text-earth-300 font-medium">Ingen marker endnu</p>
          <p className="text-earth-200 text-sm mt-1">
            Tilføj din første mark nedenfor
          </p>
        </div>
      )}

      {/* Add field form */}
      {farm && (
        <AddFieldForm
          farmId={farm.id}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          farmLat={farm.lat}
          farmLng={farm.lng}
        />
      )}
      {!farm && (
        <div className="card text-center py-4">
          <p className="text-earth-200 text-sm">
            Opret din gård i Indstillinger først
          </p>
        </div>
      )}
    </div>
  );
}
