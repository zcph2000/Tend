"use client";

import { useMemo, useState } from "react";
import { Plus, X, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export type OrchardVarietyOption = {
  id: string;
  name: string;
  crop_species: { name_da: string; crop_families: { name_da: string } | null } | null;
};

const PLANT_TYPES = [
  { v: "træ", l: "Træ" },
  { v: "busk", l: "Busk" },
  { v: "bærplante", l: "Bærplante" },
  { v: "slyngplante", l: "Slyngplante" },
  { v: "andet", l: "Andet" },
] as const;

// Gætter en fornuftig standard-type ud fra artens navn, så man ikke selv skal huske det for hver plante.
const SPECIES_PLANT_TYPE: Record<string, (typeof PLANT_TYPES)[number]["v"]> = {
  "Æble": "træ", "Pære": "træ", "Blommetre": "træ", "Kirsebærtræ": "træ",
  "Hassel": "træ", "Morbær": "træ", "Figen": "træ",
  "Ribs": "busk", "Solbær": "busk", "Stikkelsbær": "busk", "Blåbær": "busk",
  "Havtorn": "busk", "Ildtorn": "busk",
  "Hindbær": "bærplante", "Jordbær": "bærplante",
  "Vindrue": "slyngplante",
};

export default function AddFruitPlantForm({ farmId, varieties }: { farmId: string; varieties: OrchardVarietyOption[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState<OrchardVarietyOption | null>(null);

  const [name, setName] = useState("");
  const [plantType, setPlantType] = useState<string>("træ");
  const [quantity, setQuantity] = useState("1");
  const [plantedYear, setPlantedYear] = useState("");
  const [status, setStatus] = useState("planlagt");
  const [locationNote, setLocationNote] = useState("");
  const [notes, setNotes] = useState("");
  const [freeSpecies, setFreeSpecies] = useState("");
  const [freeVariety, setFreeVariety] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return varieties.slice(0, 30);
    return varieties.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.crop_species?.name_da.toLowerCase().includes(q) ||
      v.crop_species?.crop_families?.name_da.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [varieties, query]);

  function selectVariety(v: OrchardVarietyOption) {
    setSelectedVariety(v);
    setQuery(`${v.crop_species?.name_da ?? ""} · ${v.name}`);
    setShowDropdown(false);
    const speciesName = v.crop_species?.name_da;
    if (speciesName && SPECIES_PLANT_TYPE[speciesName]) setPlantType(SPECIES_PLANT_TYPE[speciesName]);
    if (!name.trim()) setName(speciesName ?? v.name);
  }
  function clearVariety() {
    setSelectedVariety(null);
    setQuery("");
  }

  function reset() {
    setQuery(""); setSelectedVariety(null); setName(""); setPlantType("træ");
    setQuantity("1"); setPlantedYear(""); setStatus("planlagt"); setLocationNote("");
    setNotes(""); setFreeSpecies(""); setFreeVariety(""); setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("fruit_plants").insert({
      farm_id: farmId,
      name: name.trim(),
      plant_type: plantType,
      variety_id: selectedVariety?.id ?? null,
      species: selectedVariety ? (selectedVariety.crop_species?.name_da ?? null) : (freeSpecies.trim() || null),
      variety: selectedVariety ? selectedVariety.name : (freeVariety.trim() || null),
      planted_year: plantedYear ? Number(plantedYear) : null,
      quantity: quantity ? Number(quantity) : 1,
      location_note: locationNote.trim() || null,
      status,
      notes: notes.trim() || null,
    });
    setSaving(false);
    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border border-dashed rounded-xl py-3 text-sm transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-muted)" }}
      >
        <Plus size={16} /> Tilføj plante
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-earth-100">Ny plante</p>
        <button type="button" onClick={reset}><X size={16} className="text-earth-400" /></button>
      </div>

      <div className="relative">
        <label className="label">Art / sort</label>
        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-500" />
          <input
            className="input w-full pl-9"
            value={query}
            onChange={(e) => { if (selectedVariety) clearVariety(); setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Søg fx Æble, Havtorn, Vindrue…"
          />
        </div>
        {showDropdown && filtered.length > 0 && !selectedVariety && (
          <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-xl max-h-64 overflow-y-auto"
            style={{ background: "var(--surface-raised)", border: "1px solid rgba(255,255,255,0.12)" }}>
            {filtered.map((v) => (
              <button key={v.id} type="button" onClick={() => selectVariety(v)}
                className="w-full text-left px-3 py-2.5 hover:brightness-110 transition-all border-b border-white/5 last:border-0">
                <p className="text-sm text-earth-100">{v.crop_species?.name_da} · {v.name}</p>
                {v.crop_species?.crop_families?.name_da && (
                  <p className="text-[10px] text-earth-500">{v.crop_species.crop_families.name_da}</p>
                )}
              </button>
            ))}
          </div>
        )}
        {selectedVariety && (
          <button type="button" onClick={clearVariety} className="text-[11px] text-earth-600 hover:text-earth-400 mt-1">Skift art/sort</button>
        )}
        {!selectedVariety && query && (
          <p className="text-[10px] text-earth-600 mt-1">Ikke fundet i databasen — udfyld art/sort manuelt herunder, eller bed om at få den tilføjet.</p>
        )}
        {!selectedVariety && query && (
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <input className="input w-full text-xs" placeholder="Art (fritekst)" value={freeSpecies} onChange={e => setFreeSpecies(e.target.value)} />
            <input className="input w-full text-xs" placeholder="Sort (fritekst)" value={freeVariety} onChange={e => setFreeVariety(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Navn *</label>
          <input required className="input w-full mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="Æbletræ nord…" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input w-full mt-1" value={plantType} onChange={e => setPlantType(e.target.value)}>
            {PLANT_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Antal</label>
          <input type="number" min="1" className="input w-full mt-1" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
        <div>
          <label className="label">Plantet år</label>
          <input type="number" min="1900" max="2040" className="input w-full mt-1" value={plantedYear} onChange={e => setPlantedYear(e.target.value)} placeholder="2025" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input w-full mt-1" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="planlagt">Planlagt</option>
            <option value="etableret">Etableret</option>
            <option value="producerer">Producerer</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Placering</label>
        <input className="input w-full mt-1" value={locationNote} onChange={e => setLocationNote(e.target.value)} placeholder="Sydmuren, langs hegnet…" />
      </div>
      <div>
        <label className="label">Noter</label>
        <textarea rows={2} className="input w-full mt-1 resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Bestøvningspartner, særlige behov…" />
      </div>

      <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full disabled:opacity-40">
        {saving ? "Gemmer…" : "Tilføj plante"}
      </button>
    </form>
  );
}
