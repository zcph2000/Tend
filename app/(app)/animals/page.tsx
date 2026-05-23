import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { GROUP_COLORS, SPECIES_ICONS } from "@/lib/groups";
import { PawPrint } from "lucide-react";
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
          { label: "Øer",      count: ewes },
          { label: "Væddere",  count: rams },
          { label: "Lam",      count: lambs },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <p className="text-2xl font-bold text-earth-50 leading-none">{s.count}</p>
            <p className="text-xs text-earth-200 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Handlinger */}
      <div className="flex items-center gap-3">
        <Link href="/animals/new" className="btn-primary flex-1 text-center">
          + Tilføj dyr
        </Link>
        <Link href="/animals/groups" className="text-sm text-earth-200 hover:text-earth-50 transition-colors">
          Grupper
        </Link>
        <span className="text-earth-700">·</span>
        <Link href="/animals/flocks" className="text-sm text-earth-200 hover:text-earth-50 transition-colors">
          Flokke
        </Link>
      </div>

      {/* Gruppe-kort */}
      {groups && groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map(group => {
            const count = animals?.filter(a => a.group_id === group.id).length ?? 0;
            const colors = GROUP_COLORS[group.color as GroupColor] ?? GROUP_COLORS.grass;
            const SpeciesIcon = SPECIES_ICONS[group.species] ?? PawPrint;
            return (
              <Link
                key={group.id}
                href={`/animals/groups/${group.id}`}
                className={`card flex items-center gap-4 hover:brightness-110 transition-all`}
              >
                <div className="w-12 h-12 bg-earth-800 rounded-2xl flex items-center justify-center flex-shrink-0 relative">
                  <SpeciesIcon size={22} className="text-earth-200" />
                  <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface-raised)] ${colors.dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-earth-50 text-base">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-earth-200 truncate mt-0.5">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge bg-earth-800 text-earth-100 font-semibold">
                    {count} dyr
                  </span>
                  <span className="text-earth-100 text-lg">›</span>
                </div>
              </Link>
            );
          })}

          {/* Ingen gruppe */}
          {ungrouped.length > 0 && (
            <Link
              href="/animals/ungrouped"
              className="card flex items-center gap-4 hover:brightness-110 transition-all"
            >
              <div className="w-12 h-12 bg-earth-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                <PawPrint size={22} className="text-earth-200" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-earth-200">Ingen gruppe</p>
                <p className="text-xs text-earth-200 mt-0.5">Ikke tildelt en gruppe endnu</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="badge bg-earth-100 text-earth-400 font-semibold">
                  {ungrouped.length} dyr
                </span>
                <span className="text-earth-100 text-lg">›</span>
              </div>
            </Link>
          )}
        </div>
      ) : (
        /* Ingen grupper endnu — vis simpel total */
        <div className="card text-center py-8">
          {total === 0 ? (
            <>
              <div className="flex justify-center mb-3"><PawPrint size={36} className="text-earth-400" /></div>
              <p className="text-earth-300">Ingen dyr endnu</p>
              <p className="text-earth-200 text-sm mt-1">Tilføj dit første dyr ovenfor</p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-3"><PawPrint size={36} className="text-earth-400" /></div>
              <p className="text-earth-200 font-semibold">{total} dyr i besætningen</p>
              <p className="text-earth-200 text-sm mt-1">
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
