"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AddDepartmentForm({ farmId }: { farmId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!name) return;
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("departments").insert({
      farm_id: farmId,
      name,
      notes: notes || null,
    });

    if (insertError) {
      setError("Kunne ikke gemme afdeling: " + insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    setName("");
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Tilføj afdeling
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-50">Ny afdeling</h3>

      <div>
        <label className="label">Navn *</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="fx Grøntsager, Får, Høns..."
        />
      </div>

      <div>
        <label className="label">Noter</label>
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Valgfrit"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">
          Annuller
        </button>
        <button
          onClick={handleSave}
          disabled={!name || loading}
          className="btn-primary flex-1"
        >
          {loading ? "Gemmer..." : "Gem afdeling"}
        </button>
      </div>
    </div>
  );
}
