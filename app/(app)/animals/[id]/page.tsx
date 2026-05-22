import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { GROUP_COLORS } from "@/lib/groups";
import { GroupColor } from "@/types";
import Link from "next/link";
import AddEventButton from "./AddEventButton";
import AssignGroupButton from "./AssignGroupButton";
import AssignFlockButton from "./AssignFlockButton";
import { notFound } from "next/navigation";

const eventConfig: Record<string, { label: string; icon: string }> = {
  vaccination:  { label: "Vaccination", icon: "💉" },
  worming:      { label: "Ormekur", icon: "💊" },
  tupping:      { label: "Sat til vædder", icon: "🐏" },
  lambing:      { label: "Lammede", icon: "🐑" },
  weighing:     { label: "Vejet", icon: "⚖️" },
  treatment:    { label: "Behandling", icon: "🏥" },
  observation:  { label: "Observation", icon: "👁️" },
  note:         { label: "Note", icon: "📝" },
  slaughtering: { label: "Slagtet", icon: "🔪" },
  sale:         { label: "Solgt", icon: "🤝" },
};

export default async function AnimalDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: animal } = await supabase
    .from("animals")
    .select("*, group:animal_groups(id, name, color)")
    .eq("id", id)
    .single();

  if (!animal) notFound();

  // Hent mor og far separat (selvjoin virker ikke pålideligt i Supabase)
  const { data: mother } = animal.mother_id ? await supabase
    .from("animals")
    .select("id, ear_tag, name")
    .eq("id", animal.mother_id)
    .single()
  : { data: null };

  const { data: father } = animal.father_id ? await supabase
    .from("animals")
    .select("id, ear_tag, name")
    .eq("id", animal.father_id)
    .single()
  : { data: null };

  // Hent afkom
  const { data: offspring } = await supabase
    .from("animals")
    .select("id, ear_tag, name, sex, birth_date")
    .or(`mother_id.eq.${id},father_id.eq.${id}`)
    .eq("status", "active")
    .order("birth_date", { ascending: false });

  // Hent søskende (samme mor)
  const { data: siblings } = animal.mother_id ? await supabase
    .from("animals")
    .select("id, ear_tag, name, sex")
    .eq("mother_id", animal.mother_id)
    .neq("id", id)
    .eq("status", "active")
    .limit(5)
  : { data: [] };

  // Hent grupper til tildeling
  const { data: groups } = await supabase
    .from("animal_groups")
    .select("id, name, color, species")
    .eq("farm_id", animal.farm_id)
    .order("name");

  // Hent flokke til tildeling
  const { data: flocks } = await supabase
    .from("flocks")
    .select("id, name, notes")
    .eq("farm_id", animal.farm_id)
    .order("name");

  // Hent nuværende flok-navn hvis dyret er i en flok
  const currentFlock = flocks?.find(f => f.id === animal.flock_id) ?? null;

  const { data: events } = await supabase
    .from("animal_events")
    .select("*")
    .eq("animal_id", id)
    .order("event_date", { ascending: false });

  const sexLabel: Record<string, string> = {
    female: "Tæve / Får", male: "Vædder / Han",
    castrated: "Kastreret", unknown: "Ukendt",
  };

  const group = animal.group as { id: string; name: string; color: string } | null;
  const groupColors = group ? GROUP_COLORS[group.color as GroupColor] ?? GROUP_COLORS.grass : null;

  return (
    <div className="space-y-4">
      {/* Dyr-header */}
      <div className="card bg-gradient-to-br from-grass-700 to-grass-900 text-white border-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-grass-300 text-xs font-medium uppercase tracking-wide">{animal.ear_tag}</p>
            <h1 className="text-2xl font-bold mt-0.5">{animal.name ?? animal.ear_tag}</h1>
            <p className="text-grass-300 text-sm mt-1">
              {sexLabel[animal.sex]} · {animal.breed ?? "Ukendt race"}
            </p>
            {animal.birth_date && (
              <p className="text-grass-400 text-sm mt-0.5">🎂 {formatDate(animal.birth_date)}</p>
            )}
          </div>
          <div className="w-14 h-14 bg-grass-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🐑</span>
          </div>
        </div>

        {/* Gruppe- og flok-badges */}
        {(group || currentFlock) && (
          <div className="mt-3 pt-3 border-t border-grass-600 flex flex-wrap gap-2">
            {group && groupColors && (
              <span className={`badge ${groupColors.bg} ${groupColors.text}`}>
                {group.name}
              </span>
            )}
            {currentFlock && (
              <span className="badge bg-earth-700 text-earth-100">
                🐑 {currentFlock.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Gruppe-tildeling */}
      <AssignGroupButton
        animalId={id}
        currentGroupId={animal.group_id}
        groups={groups ?? []}
      />

      {/* Flok-tildeling */}
      <AssignFlockButton
        animalId={id}
        currentFlockId={animal.flock_id ?? null}
        currentFlockName={currentFlock?.name ?? null}
        flocks={flocks ?? []}
      />

      {/* Stamtavle */}
      {(mother || father || (offspring && offspring.length > 0) || (siblings && siblings.length > 0)) && (
        <div className="card">
          <h3 className="font-semibold text-earth-800 mb-3">🌳 Stamtavle</h3>

          <div className="space-y-3">
            {/* Forældre */}
            {(mother || father) && (
              <div>
                <p className="text-xs font-medium text-earth-500 uppercase tracking-wide mb-2">Forældre</p>
                <div className="flex gap-2">
                  {mother && (
                    <Link href={`/animals/${mother.id}`}
                      className="flex-1 bg-grass-50 border border-grass-200 rounded-xl p-2.5 hover:bg-grass-100 transition-colors">
                      <p className="text-xs text-earth-500">Mor ♀</p>
                      <p className="font-semibold text-earth-800 text-sm">
                        {mother.name ?? mother.ear_tag}
                      </p>
                      {mother.name && <p className="text-xs text-earth-400">{mother.ear_tag}</p>}
                    </Link>
                  )}
                  {father && (
                    <Link href={`/animals/${father.id}`}
                      className="flex-1 bg-sky-50 border border-sky-200 rounded-xl p-2.5 hover:bg-sky-100 transition-colors">
                      <p className="text-xs text-earth-500">Far ♂</p>
                      <p className="font-semibold text-earth-800 text-sm">
                        {father.name ?? father.ear_tag}
                      </p>
                      {father.name && <p className="text-xs text-earth-400">{father.ear_tag}</p>}
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Afkom */}
            {offspring && offspring.length > 0 && (
              <div>
                <p className="text-xs font-medium text-earth-500 uppercase tracking-wide mb-2">
                  Afkom ({offspring.length})
                </p>
                <div className="space-y-1">
                  {offspring.map(o => (
                    <Link key={o.id} href={`/animals/${o.id}`}
                      className="flex items-center justify-between bg-earth-50 rounded-xl px-3 py-2 hover:bg-earth-100 transition-colors">
                      <div>
                        <span className="font-medium text-earth-800 text-sm">{o.name ?? o.ear_tag}</span>
                        {o.name && <span className="text-xs text-earth-400 ml-1">{o.ear_tag}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {o.birth_date && <span className="text-xs text-earth-400">{formatDate(o.birth_date)}</span>}
                        <span className="text-earth-300">›</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Søskende */}
            {siblings && siblings.length > 0 && (
              <div>
                <p className="text-xs font-medium text-earth-500 uppercase tracking-wide mb-2">
                  Søskende ({siblings.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {siblings.map(s => (
                    <Link key={s.id} href={`/animals/${s.id}`}
                      className="badge bg-earth-100 text-earth-700 hover:bg-earth-200 transition-colors">
                      {s.name ?? s.ear_tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tilføj hændelse */}
      <AddEventButton animalId={id} farmId={animal.farm_id} rams={[]} />

      {/* Hændelseshistorik */}
      <div className="card">
        <h3 className="font-semibold text-earth-800 mb-3">Historik</h3>
        {!events || events.length === 0 ? (
          <p className="text-earth-400 text-sm text-center py-4">Ingen hændelser endnu</p>
        ) : (
          <div className="space-y-1">
            {events.map(event => {
              const cfg = eventConfig[event.event_type] ?? { label: event.event_type, icon: "📋" };
              return (
                <div key={event.id} className="flex items-start gap-3 py-3 border-b border-earth-50 last:border-0">
                  <span className="text-xl mt-0.5">{cfg.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-earth-800 text-sm">{cfg.label}</p>
                      <p className="text-xs text-earth-400">{formatDate(event.event_date)}</p>
                    </div>
                    {event.notes && <p className="text-xs text-earth-500 mt-0.5">{event.notes}</p>}
                    {event.data && Object.keys(event.data).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {event.event_type === "slaughtering" ? (
                          <>
                            {(event.data as Record<string, number>).weight_kg && (
                              <span className="badge bg-amber-100 text-amber-700">
                                {(event.data as Record<string, number>).weight_kg} kg
                              </span>
                            )}
                            {(event.data as Record<string, number>).price_per_kg && (
                              <span className="badge bg-amber-100 text-amber-700">
                                {(event.data as Record<string, number>).price_per_kg} kr./kg
                              </span>
                            )}
                            {(event.data as Record<string, number>).total_kr && (
                              <span className="badge bg-grass-100 text-grass-700 font-semibold">
                                {(event.data as Record<string, number>).total_kr.toLocaleString("da-DK")} kr.
                              </span>
                            )}
                          </>
                        ) : (
                          Object.entries(event.data as Record<string, string>).map(([k, v]) => (
                            <span key={k} className="badge bg-earth-100 text-earth-600">{k}: {v}</span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link href={`/animals/${id}/edit`} className="btn-secondary w-full text-center block">
        Rediger dyr
      </Link>
    </div>
  );
}
