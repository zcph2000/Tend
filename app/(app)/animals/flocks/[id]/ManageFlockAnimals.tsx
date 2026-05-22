"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Animal {
  id: string;
  ear_tag: string;
  name: string | null;
  sex: string;
  flock_id: string | null;
  group: { id: string; name: string; color: string } | null;
}

interface Group {
  id: string;
  name: string;
  color: string;
}

export default function ManageFlockAnimals({
  flockId,
  animals,
  groups,
}: {
  flockId: string;
  animals: Animal[];
  groups: Group[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Lokalt state der spejler flock_id per dyr — for øjeblikkelig feedback
  const [flockMap, setFlockMap] = useState<Record<string, string | null>>(
    () => Object.fromEntries(animals.map(a => [a.id, a.flock_id]))
  );

  const [toggling, setToggling] = useState<string | null>(null);

  async function toggle(animalId: string) {
    const isInThisFlock = flockMap[animalId] === flockId;
    const newFlockId = isInThisFlock ? null : flockId;

    // Optimistisk opdatering
    setFlockMap(prev => ({ ...prev, [animalId]: newFlockId }));
    setToggling(animalId);

    await supabase
      .from("animals")
      .update({ flock_id: newFlockId })
      .eq("id", animalId);

    setToggling(null);
    startTransition(() => router.refresh());
  }

  // Gruppér dyr efter kategori
  const ungrouped = animals.filter(a => !a.group);
  const grouped = groups
    .map(g => ({
      group: g,
      animals: animals.filter(a => a.group?.id === g.id),
    }))
    .filter(g => g.animals.length > 0);

  const inFlockCount = Object.values(flockMap).filter(v => v === flockId).length;

  const sexIcon: Record<string, string> = {
    female: "♀", male: "♂", castrated: "⚥", unknown: "?",
  };

  function renderAnimal(animal: Animal) {
    const inThisFlock = flockMap[animal.id] === flockId;
    const inOtherFlock = flockMap[animal.id] !== null && flockMap[animal.id] !== flockId;
    const isToggling = toggling === animal.id;

    return (
      <button
        key={animal.id}
        onClick={() => toggle(animal.id)}
        disabled={isToggling}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
          inThisFlock
            ? "bg-grass-50 hover:bg-grass-100"
            : "hover:bg-earth-50"
        }`}
      >
        {/* Checkbox */}
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          inThisFlock
            ? "border-grass-500 bg-grass-500"
            : "border-earth-300 bg-white"
        }`}>
          {inThisFlock && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Dyreinfo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`font-medium text-sm truncate ${inThisFlock ? "text-grass-800" : "text-earth-800"}`}>
              {animal.name ?? animal.ear_tag}
            </p>
            {animal.name && (
              <p className="text-xs text-earth-400 truncate">{animal.ear_tag}</p>
            )}
            <span className="text-xs text-earth-400">{sexIcon[animal.sex]}</span>
          </div>
          {inOtherFlock && (
            <p className="text-xs text-amber-600 mt-0.5">I en anden flok — flyttes hertil</p>
          )}
        </div>

        {isToggling && (
          <div className="w-4 h-4 rounded-full border-2 border-grass-400 border-t-transparent animate-spin flex-shrink-0" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tæller */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-earth-500">Tryk på et dyr for at tilføje eller fjerne</p>
        <span className="badge bg-grass-100 text-grass-700 font-semibold">
          {inFlockCount} valgt
        </span>
      </div>

      <div className="card p-0 overflow-hidden divide-y divide-earth-100">
        {/* Dyr per gruppe */}
        {grouped.map(({ group, animals: groupAnimals }) => (
          <div key={group.id}>
            <div className="px-4 py-2 bg-earth-50">
              <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide">
                {group.name}
              </p>
            </div>
            {groupAnimals.map(renderAnimal)}
          </div>
        ))}

        {/* Dyr uden gruppe */}
        {ungrouped.length > 0 && (
          <div>
            {grouped.length > 0 && (
              <div className="px-4 py-2 bg-earth-50">
                <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide">
                  Ingen gruppe
                </p>
              </div>
            )}
            {ungrouped.map(renderAnimal)}
          </div>
        )}

        {animals.length === 0 && (
          <div className="text-center py-10">
            <p className="text-earth-400 text-sm">Ingen aktive dyr på gården</p>
          </div>
        )}
      </div>
    </div>
  );
}
