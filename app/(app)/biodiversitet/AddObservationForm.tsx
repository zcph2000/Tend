"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Field = { id: string; name: string };

const CATEGORIES = [
  { key: "fugl",     label: "Fugl",      emoji: "🐦" },
  { key: "insekt",   label: "Insekt",    emoji: "🦋" },
  { key: "plante",   label: "Plante",    emoji: "🌿" },
  { key: "pattedyr", label: "Pattedyr",  emoji: "🦔" },
  { key: "padde",    label: "Padde/Krybdyr", emoji: "🐸" },
  { key: "svamp",    label: "Svamp",     emoji: "🍄" },
  { key: "andet",    label: "Andet",     emoji: "🔭" },
];

export default function AddObservationForm({
  farmId,
  userId,
  fields,
}: {
  farmId: string;
  userId: string;
  fields: Field[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [category, setCategory] = useState("");
  const [species, setSpecies] = useState("");
  const [count, setCount] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  async function save() {
    if (!category) return;
    setSaving(true);
    await supabase.from("biodiversity_observations").insert({
      farm_id: farmId,
      user_id: userId,
      observed_at: date,
      category,
      species_name: species || null,
      count: count ? parseInt(count) : null,
      field_id: fieldId || null,
      location_note: locationNote || null,
      notes: notes || null,
    });
    setSaving(false);
    setOpen(false);
    setCategory(""); setSpecies(""); setCount("");
    setFieldId(""); setLocationNote(""); setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Registrer observation
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-50">Ny observation</h3>

      {/* Kategori — store touch-targets */}
      <div>
        <label className="label">Hvad så du?</label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors ${
                category === c.key
                  ? "border-earth-300 bg-white/5"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              <span className="text-xl">{c.emoji}</span>
              <span className="text-[10px] text-earth-300">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Artsnavn <span className="font-normal text-earth-400">(valgfrit)</span></label>
        <input
          type="text"
          className="input"
          value={species}
          onChange={e => setSpecies(e.target.value)}
          placeholder={
            category === "fugl" ? "fx Rødhals, Vibe, Engpiber" :
            category === "insekt" ? "fx Humlebi, Syvplettet Mariehøne" :
            category === "plante" ? "fx Kællingetand, Cikorie, Snerle" :
            "Artsnavn..."
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Antal <span className="font-normal text-earth-400">(valgfrit)</span></label>
          <input
            type="number"
            className="input"
            value={count}
            min="1"
            placeholder="fx 3"
            onChange={e => setCount(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Dato</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Lokation */}
      <div>
        <label className="label">Lokation <span className="font-normal text-earth-400">(valgfrit)</span></label>
        {fields.length > 0 && (
          <select
            className="input mb-2"
            value={fieldId}
            onChange={e => setFieldId(e.target.value)}
          >
            <option value="">— Vælg mark (valgfrit) —</option>
            {fields.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          className="input"
          value={locationNote}
          onChange={e => setLocationNote(e.target.value)}
          placeholder="fx ved nordhegnet, i polytunnellen, ved dammen"
        />
      </div>

      <div>
        <label className="label">Note <span className="font-normal text-earth-400">(valgfrit)</span></label>
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Adfærd, vejrforhold, særlige observationer..."
        />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button
          onClick={save}
          disabled={!category || saving}
          className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-default"
        >
          {saving ? "Gemmer..." : "Gem"}
        </button>
      </div>
    </div>
  );
}
