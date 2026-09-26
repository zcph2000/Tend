"use client";

import { useMemo, useState } from "react";
import { Plus, X, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export type SeedVarietyOption = {
  id: string;
  name: string;
  direct_sow: boolean | null;
  sow_indoor_from_month: number | null;
  sow_indoor_to_month: number | null;
  direct_sow_from_month: number | null;
  direct_sow_to_month: number | null;
  crop_species: { name_da: string; crop_families: { name_da: string } | null } | null;
};

export default function AddSeedForm({ farmId, varieties }: { farmId: string; varieties: SeedVarietyOption[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVariety, setSelectedVariety] = useState<SeedVarietyOption | null>(null);
  const [freeCropName, setFreeCropName] = useState("");
  const [freeVariety, setFreeVariety] = useState("");

  const [quantityG, setQuantityG] = useState("");
  const [quantitySeeds, setQuantitySeeds] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [bestBeforeYear, setBestBeforeYear] = useState("");
  const [germinationRate, setGerminationRate] = useState("");
  const [sowFrom, setSowFrom] = useState("");
  const [sowTo, setSowTo] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return varieties.slice(0, 30);
    return varieties.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.crop_species?.name_da.toLowerCase().includes(q) ||
      v.crop_species?.crop_families?.name_da.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [varieties, query]);

  function selectVariety(v: SeedVarietyOption) {
    setSelectedVariety(v);
    setQuery(`${v.crop_species?.name_da ?? ""} · ${v.name}`);
    setShowDropdown(false);
    const from = v.direct_sow ? v.direct_sow_from_month : v.sow_indoor_from_month;
    const to = v.direct_sow ? v.direct_sow_to_month : v.sow_indoor_to_month;
    setSowFrom(from ? String(from) : "");
    setSowTo(to ? String(to) : "");
  }
  function clearVariety() {
    setSelectedVariety(null);
    setQuery("");
  }

  function reset() {
    setQuery(""); setSelectedVariety(null); setFreeCropName(""); setFreeVariety("");
    setQuantityG(""); setQuantitySeeds(""); setSupplier(""); setPurchasedAt("");
    setBestBeforeYear(""); setGerminationRate(""); setSowFrom(""); setSowTo(""); setNotes("");
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cropName = selectedVariety ? selectedVariety.crop_species?.name_da ?? selectedVariety.name : freeCropName.trim();
    if (!cropName) return;
    setSaving(true);
    await supabase.from("seeds").insert({
      farm_id: farmId,
      variety_id: selectedVariety?.id ?? null,
      crop_name: cropName,
      variety: selectedVariety ? selectedVariety.name : (freeVariety.trim() || null),
      supplier: supplier.trim() || null,
      quantity_g: quantityG ? Number(quantityG) : null,
      quantity_seeds: quantitySeeds ? Number(quantitySeeds) : null,
      purchased_at: purchasedAt || null,
      best_before_year: bestBeforeYear ? Number(bestBeforeYear) : null,
      germination_rate_pct: germinationRate ? Number(germinationRate) : null,
      sowing_from_month: sowFrom ? Number(sowFrom) : null,
      sowing_to_month: sowTo ? Number(sowTo) : null,
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
        <Plus size={16} /> Tilføj frø til lager
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-earth-100">Nyt frø i lageret</p>
        <button type="button" onClick={reset}><X size={16} className="text-earth-400" /></button>
      </div>

      <div className="relative">
        <label className="label">Afgrøde / sort *</label>
        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-500" />
          <input
            className="input w-full pl-9"
            value={query}
            onChange={(e) => { if (selectedVariety) clearVariety(); setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Søg fx Tomat, Gulerod…"
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
          <button type="button" onClick={clearVariety} className="text-[11px] text-earth-600 hover:text-earth-400 mt-1">Skift afgrøde/sort</button>
        )}
        {!selectedVariety && query && (
          <>
            <p className="text-[10px] text-earth-600 mt-1">Ikke fundet i databasen — udfyld manuelt herunder.</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <input className="input w-full text-xs" placeholder="Afgrøde (fritekst)" value={freeCropName} onChange={e => setFreeCropName(e.target.value)} />
              <input className="input w-full text-xs" placeholder="Sort (fritekst)" value={freeVariety} onChange={e => setFreeVariety(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mængde (g)</label>
          <input type="number" step="0.1" min="0" className="input w-full mt-1" value={quantityG} onChange={e => setQuantityG(e.target.value)} placeholder="5" />
        </div>
        <div>
          <label className="label">Antal frø</label>
          <input type="number" min="0" className="input w-full mt-1" value={quantitySeeds} onChange={e => setQuantitySeeds(e.target.value)} placeholder="200" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Leverandør</label>
          <input className="input w-full mt-1" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Frøsamlerne…" />
        </div>
        <div>
          <label className="label">Indkøbt</label>
          <input type="date" className="input w-full mt-1" value={purchasedAt} onChange={e => setPurchasedAt(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Bedst før (år)</label>
          <input type="number" min="2020" max="2040" className="input w-full mt-1" value={bestBeforeYear} onChange={e => setBestBeforeYear(e.target.value)} placeholder="2027" />
        </div>
        <div>
          <label className="label">Faktisk spireprocent</label>
          <input type="number" min="0" max="100" className="input w-full mt-1" value={germinationRate} onChange={e => setGerminationRate(e.target.value)} placeholder="85" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Såes fra måned{selectedVariety && <span className="text-earth-600 font-normal"> (fra sorten)</span>}</label>
          <select className="input w-full mt-1" value={sowFrom} onChange={e => setSowFrom(e.target.value)}>
            <option value="">—</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Såes til måned{selectedVariety && <span className="text-earth-600 font-normal"> (fra sorten)</span>}</label>
          <select className="input w-full mt-1" value={sowTo} onChange={e => setSowTo(e.target.value)}>
            <option value="">—</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>
      {selectedVariety && (
        <p className="text-[10px] text-earth-600 -mt-1.5">Sådatoerne er foreslået ud fra sorten — juster hvis dette parti frø opfører sig anderledes.</p>
      )}
      <div>
        <label className="label">Noter</label>
        <textarea rows={2} className="input w-full mt-1 resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Forspiring 6–8 uger inden udplantning…" />
      </div>

      <button type="submit" disabled={saving || (!selectedVariety && !freeCropName.trim())} className="btn-primary w-full disabled:opacity-40">
        {saving ? "Gemmer…" : "Tilføj frø"}
      </button>
    </form>
  );
}
