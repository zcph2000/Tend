"use client";

import { useState, useMemo } from "react";
import { Plus, ChevronUp, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type VarietyOption = {
  id: string;
  name: string;
  days_to_harvest_transplant: number | null;
  weeks_to_transplant: number | null;
  harvest_from_month: number | null;
  harvest_to_month: number | null;
  crop_species: {
    name_da: string;
    crop_families: { name_da: string } | null;
  } | null;
};

type Method = "direkte_sået" | "udplantet_eget" | "udplantet_købt";

const MONTHS = ["","Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function calcExpectedHarvest(
  method: Method,
  sowDate: string,
  transplantDate: string,
  plantAgeWeeks: string,
  variety: VarietyOption | null
): string {
  if (!variety) return "";

  if ((method === "udplantet_eget" || method === "udplantet_købt") && transplantDate) {
    const dth = variety.days_to_harvest_transplant;
    if (!dth) return "";
    const standardWeeks = variety.weeks_to_transplant ?? 6;
    const actualWeeks = plantAgeWeeks ? Number(plantAgeWeeks) : standardWeeks;
    // Ældre planter → kortere tid til høst
    const adjustment = (actualWeeks - standardWeeks) * 7 * 0.5;
    return addDays(transplantDate, Math.max(dth - adjustment, dth * 0.6));
  }

  if (method === "direkte_sået" && sowDate && variety.harvest_from_month) {
    // Brug sort-data til at estimere høstmåneden
    const sowYear = new Date(sowDate).getFullYear();
    const harvestMonth = variety.harvest_from_month;
    const harvestYear = harvestMonth < new Date(sowDate).getMonth() + 1 ? sowYear + 1 : sowYear;
    return `${harvestYear}-${String(harvestMonth).padStart(2, "0")}-01`;
  }

  return "";
}

export default function AddPlantingForm({
  bedId,
  farmId,
  varieties,
}: {
  bedId: string;
  farmId: string;
  varieties: VarietyOption[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Varietetsvalg
  const [query, setQuery] = useState("");
  const [selectedVariety, setSelectedVariety] = useState<VarietyOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form-felter
  const [cropName, setCropName] = useState("");
  const [varietyName, setVarietyName] = useState("");
  const [zone, setZone] = useState("");
  const [method, setMethod] = useState<Method>("udplantet_eget");
  const [sowDate, setSowDate] = useState("");
  const [transplantDate, setTransplantDate] = useState("");
  const [plantAgeWeeks, setPlantAgeWeeks] = useState("");
  const [expectedHarvest, setExpectedHarvest] = useState("");
  const [harvestOverride, setHarvestOverride] = useState(false);
  const [quantityPlants, setQuantityPlants] = useState("");
  const [status, setStatus] = useState("planlagt");
  const [notes, setNotes] = useState("");

  // Filtrér sorter til dropdown
  const filteredVarieties = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return varieties.slice(0, 30);
    return varieties.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.crop_species?.name_da.toLowerCase().includes(q) ||
      v.crop_species?.crop_families?.name_da.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [varieties, query]);

  function selectVariety(v: VarietyOption) {
    setSelectedVariety(v);
    setCropName(v.crop_species?.name_da ?? v.name);
    setVarietyName(v.name);
    setQuery(`${v.crop_species?.name_da ?? ""} · ${v.name}`);
    setShowDropdown(false);
    // Genberegn forventet høst
    if (!harvestOverride) {
      setExpectedHarvest(calcExpectedHarvest(method, sowDate, transplantDate, plantAgeWeeks, v));
    }
  }

  function clearVariety() {
    setSelectedVariety(null);
    setQuery("");
    setCropName("");
    setVarietyName("");
  }

  // Genberegn høst når relevante felter ændres
  function updateHarvest(
    m: Method = method,
    sd: string = sowDate,
    td: string = transplantDate,
    paw: string = plantAgeWeeks,
    v: VarietyOption | null = selectedVariety
  ) {
    if (!harvestOverride) {
      setExpectedHarvest(calcExpectedHarvest(m, sd, td, paw, v));
    }
  }

  function reset() {
    setOpen(false);
    setQuery(""); setSelectedVariety(null);
    setCropName(""); setVarietyName(""); setZone("");
    setMethod("udplantet_eget"); setSowDate(""); setTransplantDate("");
    setPlantAgeWeeks(""); setExpectedHarvest(""); setHarvestOverride(false);
    setQuantityPlants(""); setStatus("planlagt"); setNotes("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = cropName.trim() || query.split("·")[0]?.trim();
    if (!name) return;
    setSaving(true);

    const season = transplantDate
      ? new Date(transplantDate).getFullYear()
      : sowDate
      ? new Date(sowDate).getFullYear()
      : new Date().getFullYear();

    await supabase.from("bed_plantings").insert({
      bed_id: bedId,
      farm_id: farmId,
      variety_id: selectedVariety?.id ?? null,
      crop_name: name,
      variety: varietyName || null,
      zone_description: zone || null,
      method,
      sowed_at: sowDate || null,
      transplanted_at: transplantDate || null,
      plant_age_weeks_at_transplant: plantAgeWeeks ? Number(plantAgeWeeks) : null,
      expected_harvest_at: expectedHarvest || null,
      quantity_plants: quantityPlants ? Number(quantityPlants) : null,
      status,
      season,
      notes: notes || null,
    });

    setSaving(false);
    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm transition-colors"
        style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "var(--text-muted)" }}
      >
        <Plus size={16} />
        Tilføj planting
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl p-4 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-earth-100 text-sm">Ny planting</h3>
        <button type="button" onClick={reset}>
          <ChevronUp size={16} className="text-earth-400" />
        </button>
      </div>

      {/* Varietetsvalg */}
      <div className="relative">
        <label className="label">Afgrøde / sort</label>
        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-500" />
          <input
            className="input w-full pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              if (!e.target.value) clearVariety();
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Søg sort, art eller familie…"
          />
        </div>

        {showDropdown && filteredVarieties.length > 0 && !selectedVariety && (
          <div
            className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
            style={{ background: "var(--surface-raised)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {filteredVarieties.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVariety(v)}
                className="w-full text-left px-3 py-2.5 hover:brightness-110 transition-all border-b border-white/5 last:border-0"
                style={{ background: "transparent" }}
              >
                <p className="text-sm text-earth-100">{v.name}</p>
                <p className="text-[10px] text-earth-500">
                  {v.crop_species?.name_da}
                  {v.crop_species?.crop_families?.name_da && ` · ${v.crop_species.crop_families.name_da}`}
                </p>
              </button>
            ))}
          </div>
        )}

        {selectedVariety && (
          <div className="mt-1 text-[11px] text-earth-500 flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.1)", color: "var(--grass)" }}
            >
              {selectedVariety.crop_species?.crop_families?.name_da ?? "Ukendt familie"}
            </span>
            <button type="button" onClick={clearVariety} className="text-earth-600 hover:text-earth-400">
              Skift sort
            </button>
          </div>
        )}

        {!selectedVariety && query && (
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Art (fx Tomat)</label>
              <input className="input w-full mt-0.5 text-xs" value={cropName}
                onChange={(e) => setCropName(e.target.value)} placeholder="Fri tekst" />
            </div>
            <div>
              <label className="label text-[10px]">Sort</label>
              <input className="input w-full mt-0.5 text-xs" value={varietyName}
                onChange={(e) => setVarietyName(e.target.value)} placeholder="Fri tekst" />
            </div>
          </div>
        )}
      </div>

      {/* Zone */}
      <div>
        <label className="label">Zone i bedet</label>
        <input
          className="input w-full mt-1"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="fx Hele bedet, Nord halvdel, Sydlig tredjedel"
        />
      </div>

      {/* Metode */}
      <div>
        <label className="label">Metode</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {([
            { v: "direkte_sået",   l: "Direkte sået" },
            { v: "udplantet_eget", l: "Udplantet — eget" },
            { v: "udplantet_købt", l: "Udplantet — købt" },
          ] as { v: Method; l: string }[]).map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => {
                setMethod(m.v);
                updateHarvest(m.v);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: method === m.v ? "var(--clay)" : "var(--surface-raised)",
                color: method === m.v ? "#fff" : "var(--text-muted)",
              }}
            >
              {m.l}
            </button>
          ))}
        </div>
      </div>

      {/* Datoer */}
      <div className="space-y-3">
        {method === "direkte_sået" ? (
          <div>
            <label className="label">Sådato</label>
            <input
              type="date"
              className="input w-full mt-1"
              value={sowDate}
              onChange={(e) => { setSowDate(e.target.value); updateHarvest(method, e.target.value); }}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[11px]">Sået (valgfrit)</label>
                <input type="date" className="input w-full mt-1 text-xs" value={sowDate}
                  onChange={(e) => setSowDate(e.target.value)} />
              </div>
              <div>
                <label className="label text-[11px]">Udplantet *</label>
                <input
                  type="date"
                  className="input w-full mt-1 text-xs"
                  value={transplantDate}
                  onChange={(e) => { setTransplantDate(e.target.value); updateHarvest(method, sowDate, e.target.value); }}
                />
              </div>
            </div>
            <div>
              <label className="label">Planternes alder ved udplantning</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min="1"
                  max="52"
                  className="input w-24"
                  value={plantAgeWeeks}
                  onChange={(e) => { setPlantAgeWeeks(e.target.value); updateHarvest(method, sowDate, transplantDate, e.target.value); }}
                  placeholder="8"
                />
                <span className="text-sm text-earth-400">uger</span>
                {selectedVariety?.weeks_to_transplant && (
                  <span className="text-xs text-earth-600">
                    (standard: {selectedVariety.weeks_to_transplant} uger)
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Forventet høst */}
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Forventet høst</label>
            {expectedHarvest && !harvestOverride && (
              <button
                type="button"
                onClick={() => setHarvestOverride(true)}
                className="text-[10px] text-earth-500 hover:text-earth-300"
              >
                Tilsidesæt beregning
              </button>
            )}
          </div>
          <input
            type="date"
            className="input w-full mt-1"
            value={expectedHarvest}
            onChange={(e) => { setExpectedHarvest(e.target.value); setHarvestOverride(true); }}
            readOnly={!!expectedHarvest && !harvestOverride}
            style={{ opacity: expectedHarvest && !harvestOverride ? 0.7 : 1 }}
          />
          {expectedHarvest && !harvestOverride && selectedVariety?.days_to_harvest_transplant && (
            <p className="text-[10px] text-earth-500 mt-0.5">
              Beregnet: {selectedVariety.days_to_harvest_transplant} dage fra udplantning
              {plantAgeWeeks && selectedVariety.weeks_to_transplant &&
                Number(plantAgeWeeks) !== selectedVariety.weeks_to_transplant &&
                ` (justeret for alder)`}
            </p>
          )}
        </div>
      </div>

      {/* Status + antal */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input w-full mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="planlagt">Planlagt</option>
            <option value="spiret">Spiret</option>
            <option value="plantet">Plantet ud</option>
            <option value="høstet">Høstet</option>
          </select>
        </div>
        <div>
          <label className="label">Antal planter</label>
          <input
            type="number" min="1"
            className="input w-full mt-1"
            value={quantityPlants}
            onChange={(e) => setQuantityPlants(e.target.value)}
            placeholder="12"
          />
        </div>
      </div>

      {/* Noter */}
      <div>
        <label className="label">Noter</label>
        <textarea
          rows={2}
          className="input w-full mt-1 resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bemærkninger om denne planting…"
        />
      </div>

      <button
        type="submit"
        disabled={saving || (!cropName.trim() && !query.trim())}
        className="btn-primary w-full disabled:opacity-40"
      >
        {saving ? "Gemmer…" : "Tilføj planting"}
      </button>
    </form>
  );
}
