"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GROUP_COLORS } from "@/lib/groups";
import { GroupColor } from "@/types";

interface Group {
  id: string;
  name: string;
  color: string;
  species: string;
}

export default function AssignGroupButton({
  animalId,
  currentGroupId,
  groups,
}: {
  animalId: string;
  currentGroupId: string | null;
  groups: Group[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function assign(groupId: string | null) {
    setLoading(true);
    await supabase.from("animals").update({ group_id: groupId }).eq("id", animalId);
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (groups.length === 0) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full text-sm">
        {currentGroupId ? "Skift gruppe" : "Tilføj til gruppe"}
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-earth-50 text-sm">Vælg gruppe</h3>
      <div className="space-y-2">
        {groups.map(group => {
          const colors = GROUP_COLORS[group.color as GroupColor] ?? GROUP_COLORS.grass;
          const isActive = group.id === currentGroupId;
          return (
            <button key={group.id} onClick={() => assign(group.id)}
              disabled={loading}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                isActive ? "border-earth-300 bg-white/5" : "border-earth-700 hover:border-earth-500"
              }`}>
              <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
              <span className="font-medium text-earth-100 text-sm">{group.name}</span>
              {isActive && <span className="ml-auto text-xs text-earth-300">✓</span>}
            </button>
          );
        })}
        {currentGroupId && (
          <button onClick={() => assign(null)} disabled={loading}
            className="w-full p-3 rounded-xl border-2 border-dashed border-earth-700 text-earth-300 text-sm hover:border-earth-500 transition-colors">
            Fjern fra gruppe
          </button>
        )}
      </div>
      <button onClick={() => setOpen(false)} className="btn-secondary w-full text-sm">
        Annuller
      </button>
    </div>
  );
}
