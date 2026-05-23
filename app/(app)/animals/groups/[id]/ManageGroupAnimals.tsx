"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Animal {
  id: string;
  ear_tag: string;
  name: string | null;
  sex: string;
  group_id: string | null;
}

interface Group {
  id: string;
  name: string;
}

const sexIcon: Record<string, string> = {
  female: "♀", male: "♂", castrated: "⚥", unknown: "?",
};

export default function ManageGroupAnimals({
  groupId,
  animals,
  allGroups,
}: {
  groupId: string;
  animals: Animal[];
  allGroups: Group[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [groupMap, setGroupMap] = useState<Record<string, string | null>>(
    () => Object.fromEntries(animals.map(a => [a.id, a.group_id]))
  );
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggle(animalId: string) {
    const isInThisGroup = groupMap[animalId] === groupId;
    const newGroupId = isInThisGroup ? null : groupId;

    setGroupMap(prev => ({ ...prev, [animalId]: newGroupId }));
    setToggling(animalId);

    await supabase
      .from("animals")
      .update({ group_id: newGroupId })
      .eq("id", animalId);

    setToggling(null);
    startTransition(() => router.refresh());
  }

  const inGroupCount = Object.values(groupMap).filter(v => v === groupId).length;

  // Opdel: i denne gruppe, ingen gruppe, i anden gruppe
  const inThisGroup = animals.filter(a => groupMap[a.id] === groupId);
  const noGroup = animals.filter(a => groupMap[a.id] === null);
  const inOtherGroup = animals.filter(a => groupMap[a.id] !== null && groupMap[a.id] !== groupId);

  function renderAnimal(animal: Animal) {
    const inThis = groupMap[animal.id] === groupId;
    const otherGroupId = groupMap[animal.id];
    const otherGroup = otherGroupId && otherGroupId !== groupId
      ? allGroups.find(g => g.id === otherGroupId)
      : null;
    const isToggling = toggling === animal.id;

    return (
      <button
        key={animal.id}
        onClick={() => toggle(animal.id)}
        disabled={isToggling}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
          inThis ? "bg-white/5 hover:bg-white/10" : "hover:bg-white/5"
        }`}
      >
        {/* Checkbox */}
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          inThis ? "border-earth-300 bg-earth-300" : "border-earth-600 bg-earth-800"
        }`}>
          {inThis && (
            <svg className="w-3.5 h-3.5 text-earth-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Dyreinfo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm text-earth-100 truncate">
              {animal.name ?? animal.ear_tag}
            </p>
            {animal.name && (
              <p className="text-xs text-earth-300 truncate">{animal.ear_tag}</p>
            )}
            <span className="text-xs text-earth-300">{sexIcon[animal.sex]}</span>
          </div>
          {otherGroup && (
            <p className="text-xs text-amber-500 mt-0.5">I gruppen "{otherGroup.name}" — flyttes hertil</p>
          )}
        </div>

        {isToggling && (
          <div className="w-4 h-4 rounded-full border-2 border-earth-300 border-t-transparent animate-spin flex-shrink-0" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-earth-300">Tryk for at tilføje eller fjerne fra gruppen</p>
        <span className="badge bg-earth-800 text-earth-100 font-semibold">
          {inGroupCount} valgt
        </span>
      </div>

      <div className="card p-0 overflow-hidden divide-y divide-white/5">
        {/* Dyr i denne gruppe */}
        {inThisGroup.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-white/5">
              <p className="text-xs font-semibold text-earth-300 uppercase tracking-wide">I denne gruppe</p>
            </div>
            {inThisGroup.map(renderAnimal)}
          </div>
        )}

        {/* Dyr uden gruppe */}
        {noGroup.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-white/5">
              <p className="text-xs font-semibold text-earth-300 uppercase tracking-wide">Ingen gruppe</p>
            </div>
            {noGroup.map(renderAnimal)}
          </div>
        )}

        {/* Dyr i andre grupper */}
        {inOtherGroup.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-white/5">
              <p className="text-xs font-semibold text-earth-300 uppercase tracking-wide">I andre grupper</p>
            </div>
            {inOtherGroup.map(renderAnimal)}
          </div>
        )}

        {animals.length === 0 && (
          <div className="text-center py-10">
            <p className="text-earth-300 text-sm">Ingen aktive dyr på gården</p>
          </div>
        )}
      </div>
    </div>
  );
}
