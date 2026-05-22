"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GROUP_COLORS, SPECIES_ICONS } from "@/lib/groups";
import { GroupColor } from "@/types";

const COLORS: GroupColor[] = ["grass", "amber", "sky", "earth", "red", "purple"];
const COLOR_NAMES: Record<GroupColor, string> = {
  grass: "Grøn", amber: "Gul", sky: "Blå",
  earth: "Brun", red: "Rød", purple: "Lilla",
};

const SPECIES_OPTIONS = [
  { value: "sheep", label: "Får" },
  { value: "cattle", label: "Kvæg" },
  { value: "goats", label: "Geder" },
  { value: "chickens", label: "Høns" },
  { value: "pigs", label: "Svin" },
  { value: "other", label: "Andet" },
];

export default function CreateGroupForm({ farmId }: { farmId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("sheep");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<GroupColor>("grass");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!name) return;
    setLoading(true);
    await supabase.from("animal_groups").insert({
      farm_id: farmId, name, species, description: description || null, color,
    });
    setLoading(false);
    setOpen(false);
    setName(""); setDescription(""); setColor("grass");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Opret gruppe
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-900">Ny gruppe</h3>

      <div>
        <label className="label">Navn *</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)}
          placeholder="fx Moderdyr, Lam 2025, Væddere..." />
      </div>

      <div>
        <label className="label">Dyreart</label>
        <select className="input" value={species} onChange={e => setSpecies(e.target.value)}>
          {SPECIES_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>
              {SPECIES_ICONS[s.value]} {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Farve</label>
        <div className="flex gap-2">
          {COLORS.map(c => {
            const col = GROUP_COLORS[c];
            return (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full ${col.dot} transition-transform ${
                  color === c ? "ring-2 ring-offset-2 ring-earth-400 scale-110" : ""
                }`}
                title={COLOR_NAMES[c]}
              />
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">Beskrivelse</label>
        <textarea className="input" rows={2} value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="fx Øer der skal lamme forår 2025..." />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={handleSave} disabled={!name || loading} className="btn-primary flex-1">
          {loading ? "Gemmer..." : "Opret gruppe"}
        </button>
      </div>
    </div>
  );
}
