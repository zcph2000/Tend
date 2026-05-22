import { createClient } from "@/lib/supabase/server";
import { GROUP_COLORS, SPECIES_ICONS } from "@/lib/groups";
import { GroupColor } from "@/types";
import CreateGroupForm from "./CreateGroupForm";
import Link from "next/link";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  const { data: groups } = farm ? await supabase
    .from("animal_groups")
    .select("*, animals(id, status)")
    .eq("farm_id", farm.id)
    .order("name")
  : { data: [] };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-earth-900">Flokgrupper</h2>
          <p className="text-earth-500 text-sm">Organiser dine dyr i grupper</p>
        </div>
        <Link href="/animals" className="text-sm text-grass-600 font-medium">
          ← Alle dyr
        </Link>
      </div>

      {/* Gruppe-liste */}
      {groups && groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => {
            const colors = GROUP_COLORS[group.color as GroupColor] ?? GROUP_COLORS.grass;
            const activeCount = group.animals?.filter((a: { status: string }) => a.status === "active").length ?? 0;
            return (
              <div key={group.id} className={`card border-2 ${colors.border}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xl">{SPECIES_ICONS[group.species] ?? "🐾"}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-earth-900">{group.name}</h3>
                      <p className="text-earth-500 text-sm">
                        {activeCount} aktive dyr · {group.species === "sheep" ? "Får" : group.species}
                      </p>
                      {group.description && (
                        <p className="text-earth-400 text-xs mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${colors.bg} ${colors.text}`}>
                    {activeCount} dyr
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-4xl mb-3">🐑</p>
          <p className="text-earth-500 font-medium">Ingen grupper endnu</p>
          <p className="text-earth-400 text-sm mt-1">
            Opret fx "Moderdyr", "Lam 2025", "Væddere"
          </p>
        </div>
      )}

      {farm && <CreateGroupForm farmId={farm.id} />}
    </div>
  );
}
