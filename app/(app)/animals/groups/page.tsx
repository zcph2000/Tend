import { createClient } from "@/lib/supabase/server";
import { GROUP_COLORS } from "@/lib/groups";
import { GroupColor } from "@/types";
import CreateGroupForm from "./CreateGroupForm";
import Link from "next/link";
import { PawPrint } from "lucide-react";

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
          <h2 className="text-xl font-bold text-earth-50">Flokgrupper</h2>
          <p className="text-earth-300 text-sm">Organiser dine dyr i grupper</p>
        </div>
        <Link href="/animals" className="text-sm text-earth-300 font-medium">
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
              <Link key={group.id} href={`/animals/groups/${group.id}`}
                className="card block hover:brightness-110 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <div>
                      <h3 className="font-semibold text-earth-50">{group.name}</h3>
                      <p className="text-earth-300 text-sm">
                        {activeCount} dyr · {group.species === "sheep" ? "Får" : group.species}
                      </p>
                      {group.description && (
                        <p className="text-earth-200 text-xs mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-earth-100 text-lg">›</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-8">
          <div className="flex justify-center mb-3"><PawPrint size={36} className="text-earth-400" /></div>
          <p className="text-earth-300 font-medium">Ingen grupper endnu</p>
          <p className="text-earth-200 text-sm mt-1">
            Opret fx "Moderdyr", "Lam 2025", "Væddere"
          </p>
        </div>
      )}

      {farm && <CreateGroupForm farmId={farm.id} />}
    </div>
  );
}
