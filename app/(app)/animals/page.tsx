import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { GROUP_COLORS, SPECIES_ICONS } from "@/lib/groups";
import { GroupColor } from "@/types";

export default async function AnimalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  const { data: animals } = farm ? await supabase
    .from("animals")
    .select("id, sex, birth_date, group_id")
    .eq("farm_id", farm.id)
    .eq("status", "active")
  : { data: [] };

  const { data: groups } = farm ? await supabase
    .from("animal_groups")
    .select("id, name, color, species, description")
    .eq("farm_id", farm.id)
    .order("name")
  : { data: [] };

  const total = animals?.length ?? 0;
  const ewes = animals?.filter(a => a.sex === "female").length ?? 0;
  const rams = animals?.filter(a => a.sex === "male").length ?? 0;
  const lambs = animals?.filter(a => {
    if (!a.birth_date) return false;
    const months = (Date.now() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months < 12;
  }).length ?? 0;

  const ungrouped = animals?.filter(a => !a.group_id) ?? [];

  return (
    <div className="space-y-4">
      {/* Statistik */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Øer", count: ewes, icon: "🐑" },
          { label: "Væddere", count: rams, icon: "🐏" },
          { label: "Lam", count: lambs, icon: "🍼" },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <p className="text-2xl">{s.icon}</p>
            <p className="text-2xl font-bold text-earth-900 leading-none mt-1">{s.count}</p>
            <p className="text-xs text-earth-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Handlinger */}
      <div className="flex gap-2">
        <Link href="/animals/new" className="btn-primary flex-1 text-center">
          + Tilføj dyr
        </Link>
        <Link href="/animals/groups" className="btn-secondary px-3 text-center text-sm">
          Grupper
        </Link>
        <Link href="/animals/flocks" className="btn-secondary px-3 text-center text-sm">
          Flokke
        </Link>
      </div>

      {/* Gruppe-kort */}
      {groups && groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map(group => {
            const count = animals?.filter(a => a.group_id === group.id).length ?? 0;
            const colors = GROUP_COLORS[group.color as GroupColor] ?? GROUP_COLORS.grass;
            const icon = SPECIES_ICONS[group.species] ?? "🐾";
            return (
              <Link
                key={group.id}
                href={`/animals/groups/${group.id}`}
                className={`card flex items-center gap-4 hover:opacity-90 transition-opacity active:scale-[0.98]`}
              >
                <div className={`w-12 h-12 ${colors.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  <span className="text-2xl">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${colors.text} text-base`}>{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-earth-400 truncate mt-0.5">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge ${colors.bg} ${colors.text} font-semibold`}>
                    {count} dyr
                  </span>
                  <span className="text-earth-300 text-lg">›</span>
                </div>
              </Link>
            );
          })}

          {/* Ingen gruppe */}
          {ungrouped.length > 0 && (
            <Link
              href="/animals/ungrouped"
              className="card flex items-center gap-4 hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-earth-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🐾</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-earth-700">Ingen gruppe</p>
                <p className="text-xs text-earth-400 mt-0.5">Ikke tildelt en gruppe endnu</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="badge bg-earth-100 text-earth-600 font-semibold">
                  {ungrouped.length} dyr
                </span>
                <span className="text-earth-300 text-lg">›</span>
              </div>
            </Link>
          )}
        </div>
      ) : (
        /* Ingen grupper endnu — vis simpel total */
        <div className="card text-center py-8">
          {total === 0 ? (
            <>
              <p className="text-4xl mb-3">🐑</p>
              <p className="text-earth-500">Ingen dyr endnu</p>
              <p className="text-earth-400 text-sm mt-1">Tilføj dit første dyr ovenfor</p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">🐑</p>
              <p className="text-earth-700 font-semibold">{total} dyr i besætningen</p>
              <p className="text-earth-400 text-sm mt-1">
                Opret grupper for at organisere din besætning
              </p>
              <Link href="/animals/groups" className="btn-secondary mt-4 inline-block px-6">
                Opret grupper
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
