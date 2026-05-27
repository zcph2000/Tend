"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const WATER_LABELS = ["Ingen", "Meget lav", "Lav", "Middel", "God", "Fremragende"];
const COMPACT_LABELS = ["Løs", "Let kompakt", "Moderat", "Kompakt", "Meget kompakt", "Beton-hård"];

export default function AddSoilObservationForm({
  fieldId,
  farmId,
}: {
  fieldId: string;
  farmId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [ph, setPh] = useState<string>("");
  const [om, setOm] = useState<string>("");
  const [worms, setWorms] = useState<string>("");
  const [water, setWater] = useState<number>(3);
  const [compact, setCompact] = useState<number>(2);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  async function save() {
    setLoading(true);
    await supabase.from("soil_observations").insert({
      field_id: fieldId,
      farm_id: farmId,
      observed_at: date,
      ph: ph ? parseFloat(ph) : null,
      organic_matter_pct: om ? parseFloat(om) : null,
      earthworm_count: worms ? parseInt(worms) : null,
      water_retention: water,
      compaction: compact,
      notes: notes || null,
    });
    setLoading(false);
    setOpen(false);
    setPh(""); setOm(""); setWorms(""); setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Tilføj jordobservation
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-50">Ny jordobservation</h3>

      <div>
        <label className="label">Dato</label>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">pH</label>
          <input type="number" className="input" value={ph} step="0.1" min="0" max="14"
            placeholder="fx 6.5"
            onChange={e => setPh(e.target.value)} />
          <p className="text-xs text-earth-400 mt-1">Optimalt: 6.0–7.0</p>
        </div>
        <div>
          <label className="label">Organisk stof %</label>
          <input type="number" className="input" value={om} step="0.1" min="0" max="100"
            placeholder="fx 3.2"
            onChange={e => setOm(e.target.value)} />
          <p className="text-xs text-earth-400 mt-1">Mål: stigende over tid</p>
        </div>
      </div>

      <div>
        <label className="label">Regnorme pr. m² <span className="font-normal text-earth-400">(spade 30×30×30 cm)</span></label>
        <input type="number" className="input" value={worms} min="0"
          placeholder="fx 12"
          onChange={e => setWorms(e.target.value)} />
        <p className="text-xs text-earth-400 mt-1">Under 10: lav aktivitet · 10–25: ok · Over 25: fremragende</p>
      </div>

      <div>
        <label className="label">Vandretention — {WATER_LABELS[water]}</label>
        <input type="range" min="0" max="5" step="1" value={water}
          onChange={e => setWater(parseInt(e.target.value))}
          className="w-full accent-earth-300" />
        <div className="flex justify-between text-xs text-earth-400 mt-0.5">
          <span>Ingen</span><span>Fremragende</span>
        </div>
      </div>

      <div>
        <label className="label">Kompaktering — {COMPACT_LABELS[compact]}</label>
        <input type="range" min="0" max="5" step="1" value={compact}
          onChange={e => setCompact(parseInt(e.target.value))}
          className="w-full accent-earth-300" />
        <div className="flex justify-between text-xs text-earth-400 mt-0.5">
          <span>Løs jord</span><span>Meget kompakt</span>
        </div>
      </div>

      <div>
        <label className="label">Note</label>
        <textarea className="input" rows={2} value={notes}
          placeholder="Observationer, vejrforhold, metode..."
          onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={save} disabled={loading} className="btn-primary flex-1">
          {loading ? "Gemmer..." : "Gem observation"}
        </button>
      </div>
    </div>
  );
}
