"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateFlockForm({ farmId }: { farmId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
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
      notes: notes.trim() || null,
    });
    setLoading(false);
    setOpen(false);
    setName("");
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
