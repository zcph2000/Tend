"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Compass, Droplets, Plus } from "lucide-react";

const ORIENTATIONS = [
  { label: "N–S", value: 0 },
  { label: "NØ–SV", value: 45 },
  { label: "Ø–V", value: 90 },
  { label: "SØ–NV", value: 135 },
];

// Loaded server-side via component props — passed via a thin server wrapper below.
// We export the client form directly for simplicity (page is small).

export default function NytBedPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sectionMode, setSectionMode] = useState<"none" | "existing" | "new">("none");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [sectionOrientation, setSectionOrientation] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [widthM, setWidthM] = useState("");
  const [orientation, setOrientation] = useState<number | null>(null);
  const [hasDrip, setHasDrip] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [notes, setNotes] = useState("");

  async function loadSections() {
    if (sectionsLoaded) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) return;
    const { data } = await supabase.from("bed_sections").select("id, name").eq("farm_id", farm.id).order("name");
    setSections(data ?? []);
    setSectionsLoaded(true);
  }

  async function handleSectionModeChange(mode: "none" | "existing" | "new") {
    setSectionMode(mode);
    if (mode !== "none") await loadSections();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) { setSaving(false); return; }

    let sectionId: string | null = null;

    if (sectionMode === "existing" && selectedSectionId) {
      sectionId = selectedSectionId;
    } else if (sectionMode === "new" && newSectionName.trim()) {
      const { data: sec } = await supabase.from("bed_sections").insert({
        farm_id: farm.id,
        name: newSectionName.trim(),
        orientation_degrees: sectionOrientation,
      }).select("id").single();
      sectionId = sec?.id ?? null;
    }

    const { data: bed } = await supabase.from("beds").insert({
      farm_id: farm.id,
      section_id: sectionId,
      name: name.trim(),
      length_m: lengthM ? Number(lengthM) : null,
      width_m: widthM ? Number(widthM) : null,
      orientation_degrees: orientation,
      has_drip_irrigation: hasDrip,
      location_note: locationNote || null,
      notes: notes || null,
      status: "aktiv",
    }).select("id").single();

    setSaving(false);
    if (bed) router.push(`/jordbrug/bede/${bed.id}`);
    else router.push("/jordbrug/bede");
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Nyt bed</h1>
        <p className="text-sm text-earth-300 mt-0.5">Opret et permanent no-dig bed</p>
      </div>

      <form onSubmit={submit} className="space-y-4">

        {/* Sektion */}
        <div className="card space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Sektion</h2>
          <div className="flex flex-wrap gap-2">
            {(["none", "existing", "new"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSectionModeChange(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: sectionMode === m ? "var(--clay)" : "var(--surface-raised)",
                  color: sectionMode === m ? "#fff" : "var(--text-muted)",
                }}
              >
                {m === "none" ? "Ingen sektion" : m === "existing" ? "Tilknyt sektion" : "Ny sektion"}
              </button>
            ))}
          </div>

          {sectionMode === "existing" && (
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="input w-full"
            >
              <option value="">Vælg sektion…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {sectionMode === "new" && (
            <div className="space-y-3">
              <div>
                <label className="label">Sektionsnavn *</label>
                <input
                  className="input w-full mt-1"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="fx Havesektionen, Polytunnel 1, Nordhaven"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Compass size={12} />Sektionens orientering</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ORIENTATIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSectionOrientation(sectionOrientation === o.value ? null : o.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: sectionOrientation === o.value ? "var(--clay)" : "var(--surface-raised)",
                        color: sectionOrientation === o.value ? "#fff" : "var(--text-muted)",
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-earth-600 mt-1">Bedenes langside-retning — bruges til at placere høje afgrøder korrekt</p>
              </div>
            </div>
          )}
        </div>

        {/* Bed-detaljer */}
        <div className="card space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Bed</h2>

          <div>
            <label className="label">Navn eller nummer *</label>
            <input
              required
              className="input w-full mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="fx Bed 1, Tomatbed, Nordbed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Længde (m)</label>
              <input
                type="number" step="0.1" min="0"
                className="input w-full mt-1"
                value={lengthM}
                onChange={(e) => setLengthM(e.target.value)}
                placeholder="3.6"
              />
            </div>
            <div>
              <label className="label">Bredde (m)</label>
              <input
                type="number" step="0.1" min="0"
                className="input w-full mt-1"
                value={widthM}
                onChange={(e) => setWidthM(e.target.value)}
                placeholder="1.2"
              />
            </div>
          </div>
          {lengthM && widthM && (
            <p className="text-xs text-earth-500 -mt-2">
              Areal: {(Number(lengthM) * Number(widthM)).toFixed(1)} m²
            </p>
          )}

          {sectionMode !== "existing" && (
            <div>
              <label className="label flex items-center gap-1"><Compass size={12} />Bedets orientering</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ORIENTATIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOrientation(orientation === o.value ? null : o.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: orientation === o.value ? "var(--clay)" : "var(--surface-raised)",
                      color: orientation === o.value ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setHasDrip(!hasDrip)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: hasDrip ? "rgba(56,189,248,0.12)" : "var(--surface-raised)",
              color: hasDrip ? "#38bdf8" : "var(--text-muted)",
              border: hasDrip ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
            }}
          >
            <Droplets size={15} />
            Drypvanding installeret
          </button>

          <div>
            <label className="label">Placering / note</label>
            <input
              className="input w-full mt-1"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="fx Sydvendt hjørne, ved laden"
            />
          </div>

          <div>
            <label className="label">Jordforhold / noter</label>
            <textarea
              rows={2}
              className="input w-full mt-1 resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="fx Tilsat 5 cm kompost, god dræning"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn-primary w-full disabled:opacity-40"
        >
          {saving ? "Opretter…" : "Opret bed"}
        </button>
      </form>
    </div>
  );
}
