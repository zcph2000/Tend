"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Flock {
  id: string;
  name: string;
  notes: string | null;
}

export default function AssignFlockButton({
  animalId,
  currentFlockId,
  currentFlockName,
  flocks,
}: {
  animalId: string;
  currentFlockId: string | null;
  currentFlockName: string | null;
  flocks: Flock[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function assign(flockId: string | null) {
    setLoading(true);
    await supabase.from("animals").update({ flock_id: flockId }).eq("id", animalId);
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full text-sm">
        {currentFlockId
          ? `Flok: ${currentFlockName ?? "Ukendt"}`
          : "Tilføj til flok"}
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-earth-900 text-sm">Vælg flok</h3>
      <div className="space-y-2">
        {flocks.length === 0 ? (
          <p className="text-sm text-earth-400 text-center py-2">
            Ingen flokke oprettet endnu
          </p>
        ) : (
          flocks.map(flock => {
            const isActive = flock.id === currentFlockId;
            return (
              <button key={flock.id} onClick={() => assign(flock.id)}
                disabled={loading}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                  isActive
                    ? "border-earth-400 bg-earth-100"
                    : "border-earth-200 hover:border-earth-300"
                }`}>
                <span className="text-xl">🐑</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-earth-800 text-sm">{flock.name}</p>
                  {flock.notes && (
                    <p className="text-xs text-earth-400 truncate">{flock.notes}</p>
                  )}
                </div>
                {isActive && (
                  <span className="text-xs text-earth-500 flex-shrink-0">Nuværende</span>
                )}
              </button>
            );
          })
        )}
        {currentFlockId && (
          <button onClick={() => assign(null)} disabled={loading}
            className="w-full p-3 rounded-xl border-2 border-dashed border-earth-200 text-earth-400 text-sm hover:border-earth-300 transition-colors">
            Fjern fra flok
          </button>
        )}
      </div>
      <button onClick={() => setOpen(false)} className="btn-secondary w-full text-sm">
        Annuller
      </button>
    </div>
  );
}
