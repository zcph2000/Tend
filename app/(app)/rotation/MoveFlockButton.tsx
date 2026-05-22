"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Section {
  id: string;
  name: string;
  area_ha: number;
  field: { name: string } | null;
}

interface Flock {
  id: string;
  name: string;
  animal_count: number;
  current_section_id: string | null;
}

export default function MoveFlockButton({
  flocks,
  sections,
  farmId,
  activeGrazingIds,
}: {
  flocks: Flock[];
  sections: Section[];
  farmId: string;
  activeGrazingIds: Record<string, string>; // flock_id → grazing_record_id
}) {
  const [open, setOpen] = useState(false);
  const [selectedFlockId, setSelectedFlockId] = useState(flocks[0]?.id ?? "");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [grassBefore, setGrassBefore] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const selectedFlock = flocks.find(f => f.id === selectedFlockId);

  async function handleMove() {
    if (!selectedFlockId || !selectedSectionId) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    // Afslut evt. aktivt græsningsforløb for denne flok
    const activeId = activeGrazingIds[selectedFlockId];
    if (activeId) {
      await supabase
        .from("grazing_records")
        .update({ end_date: today })
        .eq("id", activeId);
    }

    // Start nyt græsningsforløb
    await supabase.from("grazing_records").insert({
      farm_id: farmId,
      section_id: selectedSectionId,
      flock_id: selectedFlockId,
      animal_count: selectedFlock?.animal_count ?? 0,
      start_date: today,
      grass_height_before: grassBefore ? parseFloat(grassBefore) : null,
      notes: notes || null,
    });

    // Opdater flokken med ny sektion og dato
    await supabase
      .from("flocks")
      .update({
        current_section_id: selectedSectionId,
        moved_in_date: today,
      })
      .eq("id", selectedFlockId);

    setLoading(false);
    setOpen(false);
    setSelectedSectionId("");
    setGrassBefore("");
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        🔄 Flyt en flok
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-900">Flyt flok</h3>

      {/* Vælg flok */}
      {flocks.length > 1 && (
        <div>
          <label className="label">Hvilken flok?</label>
          <div className="space-y-2">
            {flocks.map(f => (
              <button key={f.id} onClick={() => setSelectedFlockId(f.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                  selectedFlockId === f.id
                    ? "border-grass-500 bg-grass-50"
                    : "border-earth-200"
                }`}>
                <span className="text-xl">🐑</span>
                <div>
                  <p className="font-medium text-earth-800 text-sm">{f.name}</p>
                  <p className="text-xs text-earth-400">{f.animal_count} dyr</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vælg sektion */}
      <div>
        <label className="label">Flyt til sektion</label>
        <div className="grid grid-cols-2 gap-2">
          {sections.map(s => {
            const isCurrentForFlock = s.id === selectedFlock?.current_section_id;
            return (
              <button key={s.id} onClick={() => setSelectedSectionId(s.id)}
                disabled={isCurrentForFlock}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  isCurrentForFlock
                    ? "border-earth-100 bg-earth-50 opacity-40 cursor-not-allowed"
                    : selectedSectionId === s.id
                    ? "border-grass-500 bg-grass-50"
                    : "border-earth-200 hover:border-earth-300"
                }`}>
                <p className="font-medium text-earth-800 text-sm">{s.name}</p>
                <p className="text-xs text-earth-400 mt-0.5">
                  {s.field?.name} · {s.area_ha} ha
                </p>
                {isCurrentForFlock && (
                  <p className="text-xs text-earth-400 mt-0.5">Her nu</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Græshøjde (cm)</label>
        <input type="number" className="input" placeholder="fx 15"
          value={grassBefore} onChange={e => setGrassBefore(e.target.value)} />
        <p className="text-xs text-earth-400 mt-1">Måles i den nye sektion inden flokken flyttes</p>
      </div>

      <div>
        <label className="label">Noter</label>
        <textarea className="input" rows={2} value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observationer, vejrforhold, mv..." />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={handleMove} disabled={!selectedFlockId || !selectedSectionId || loading}
          className="btn-primary flex-1">
          {loading ? "Gemmer..." : "Flyt flokken"}
        </button>
      </div>
    </div>
  );
}
