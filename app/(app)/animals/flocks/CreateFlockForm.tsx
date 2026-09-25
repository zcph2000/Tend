"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Species } from "@/types";
import { SPECIES_LABELS } from "@/lib/animalTerms";

const SPECIES_ORDER: Species[] = ["sheep", "cattle", "goats", "chickens", "pigs", "other"];

export default function CreateFlockForm({ farmId }: { farmId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("sheep");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    await supabase.from("flocks").insert({
      farm_id: farmId,
      name: name.trim(),
      species,
      notes: notes.trim() || null,
    });
    setLoading(false);
    setOpen(false);
    setName("");
    setSpecies("sheep");
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Opret flok
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-50">Ny flok</h3>

      <div>
        <label className="label">Navn *</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)}
          placeholder="fx Fold Nord, Syd-flokken, Lammene..." />
      </div>

      <div>
        <label className="label">Dyreart</label>
        <select className="input" value={species} onChange={e => setSpecies(e.target.value as Species)}>
          {SPECIES_ORDER.map(s => (
            <option key={s} value={s}>{SPECIES_LABELS[s]}</option>
          ))}
        </select>
        <p className="text-[11px] text-earth-500 mt-1">
          Bruges til at beregne rigtig hvileperiode og sektionsstørrelse for netop denne art.
        </p>
      </div>

      <div>
        <label className="label">Beskrivelse (valgfri)</label>
        <textarea className="input" rows={2} value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="fx Moderdyr + lam på nordmarken..." />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={handleSave} disabled={!name.trim() || loading} className="btn-primary flex-1">
          {loading ? "Gemmer..." : "Opret flok"}
        </button>
      </div>
    </div>
  );
}
