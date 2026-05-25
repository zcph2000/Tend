"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, ChevronUp, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { calcLayout, zoneColor, type PlantingZone } from "@/lib/bedPlantingLayout";
import BedLayoutSVG from "./BedLayoutSVG";
import {
  getCompanionFeedback,
  YIELD_KG_PER_PLANT,
  HARVEST_DAYS_FROM_TRANSPLANT,
} from "@/lib/companionPlants";

type VarietyOption = {
  id: string;
  name: string;
  days_to_harvest_transplant: number | null;
  weeks_to_transplant: number | null;
  harvest_from_month: number | null;
  harvest_to_month: number | null;
  row_spacing_cm: number | null;
  plant_spacing_cm: number | null;
  crop_species: {
    name_da: string;
    crop_families: { name_da: string } | null;
  } | null;
};

type Method = "direkte_sået" | "udplantet_eget" | "udplantet_købt";

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
  variety: VarietyOption | null,
  family: string | null
): string {
  if (!variety) return "";
  if ((method === "udplantet_eget" || method === "udplantet_købt") && transplantDate) {
    const standardWeeks = variety.weeks_to_transplant ?? 6;
    const actualWeeks = plantAgeWeeks ? Number(plantAgeWeeks) : standardWeeks;
    const adjustment = (actualWeeks - standardWeeks) * 7 * 0.5;

    const dth: number | null =
      variety.days_to_harvest_transplant != null
        ? variety.days_to_harvest_transplant
        : family != null
          ? (HARVEST_DAYS_FROM_TRANSPLANT[family] ?? null)
          : null;
    if (!dth) return "";
    return addDays(transplantDate, Math.max(dth - adjustment, dth * 0.6));
  }
  if (method === "direkte_sået" && sowDate && variety.harvest_from_month) {
    const sowYear = new Date(sowDate).getFullYear();
    const hm = variety.harvest_from_month;
    const hy = hm < new Date(sowDate).getMonth() + 1 ? sowYear + 1 : sowYear;
    return `${hy}-${String(hm).padStart(2, "0")}-01`;
  }
  return "";
}

// Find the first free offset in the bed given occupied zones
function firstFreeOffset(zones: PlantingZone[], bedLengthM: number): number {
  const occupied = [...zones]
    .sort((a, b) => a.offsetM - b.offsetM);
  let cursor = 0;
  for (const z of occupied) {
    if (z.offsetM > cursor + 0.05) break;
    cursor = Math.max(cursor, z.offsetM + z.zoneLengthM);
  }
  return Math.min(cursor, bedLengthM);
}

export default function AddPlantingForm({
  bedId,
  farmId,
  bedLengthM,
  bedWidthM,
  varieties,
  existingZones,
}: {
  bedId: string;
  farmId: string;
  bedLengthM: number;
  bedWidthM: number;
  varieties: VarietyOption[];
  existingZones: PlantingZone[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [selectedVariety, setSelectedVariety] = useState<VarietyOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [cropName, setCropName] = useState("");
  const [varietyName, setVarietyName] = useState("");
  const [method, setMethod] = useState<Method>("udplantet_eget");
  const [sowDate, setSowDate] = useState("");
  const [transplantDate, setTransplantDate] = useState("");
  const [plantAgeWeeks, setPlantAgeWeeks] = useState("");
  const [expectedHarvest, setExpectedHarvest] = useState("");
  const [harvestOverride, setHarvestOverride] = useState(false);
  const [status, setStatus] = useState("planlagt");
  const [notes, setNotes] = useState("");

  // Spacing + zone
  const [rowSpacing, setRowSpacing] = useState("");
  const [plantSpacing, setPlantSpacing] = useState("");
  const [offsetM, setOffsetM] = useState(() => firstFreeOffset(existingZones, bedLengthM));
  const [zoneLengthM, setZoneLengthM] = useState(bedLengthM);
  const [quantityOverride, setQuantityOverride] = useState("");

  // Ledige intervaller i bedet (ekskl. eksisterende plantinger)
  const freeIntervals = useMemo(() => {
    const occupied = [...existingZones]
      .sort((a, b) => a.offsetM - b.offsetM);
    const free: { start: number; end: number }[] = [];
    let cursor = 0;
    for (const z of occupied) {
      if (z.offsetM > cursor + 0.05) free.push({ start: cursor, end: z.offsetM });
      cursor = Math.max(cursor, z.offsetM + z.zoneLengthM);
    }
    if (cursor < bedLengthM - 0.05) free.push({ start: cursor, end: bedLengthM });
    return free;
  }, [existingZones, bedLengthM]);

  const bedFull = freeIntervals.length === 0;

  // Hvilket ledigt interval er offsetM i?
  const currentSlot = freeIntervals.find(
    s => offsetM >= s.start - 0.05 && offsetM < s.end
  );
  const maxSlotLength = currentSlot ? Math.round((currentSlot.end - offsetM) * 10) / 10 : 0;

  // Når offset ændres: snap til næste ledige slot hvis man er landet i en optaget zone
  function handleOffsetChange(raw: number) {
    const val = Math.max(0, Math.min(raw, bedLengthM));
    const inFree = freeIntervals.find(s => val >= s.start - 0.05 && val < s.end);
    if (inFree) {
      setOffsetM(Math.max(inFree.start, val));
    } else {
      const next = freeIntervals.find(s => s.start >= val);
      if (next) setOffsetM(next.start);
    }
  }

  // Auto-cap zone-længde når offset eller slot ændres
  useEffect(() => {
    if (maxSlotLength > 0 && zoneLengthM > maxSlotLength) {
      setZoneLengthM(maxSlotLength);
    }
  }, [maxSlotLength]);

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
    if (v.row_spacing_cm) setRowSpacing(String(v.row_spacing_cm));
    if (v.plant_spacing_cm) setPlantSpacing(String(v.plant_spacing_cm));
    const f = v.crop_species?.crop_families?.name_da ?? null;
    if (!harvestOverride)
      setExpectedHarvest(calcExpectedHarvest(method, sowDate, transplantDate, plantAgeWeeks, v, f));
  }

  function clearVariety() {
    setSelectedVariety(null);
    setQuery(""); setCropName(""); setVarietyName("");
    setRowSpacing(""); setPlantSpacing("");
  }

  function updateHarvest(
    m: Method = method, sd = sowDate, td = transplantDate,
    paw = plantAgeWeeks, v = selectedVariety, fam = family
  ) {
    if (!harvestOverride) setExpectedHarvest(calcExpectedHarvest(m, sd, td, paw, v, fam));
  }

  // Live layout
  const layout = useMemo(() => calcLayout(bedWidthM, {
    zoneLengthM: Math.min(zoneLengthM, bedLengthM - offsetM),
    rowSpacingCm: rowSpacing ? Number(rowSpacing) : null,
    plantSpacingCm: plantSpacing ? Number(plantSpacing) : null,
  }), [bedWidthM, zoneLengthM, offsetM, rowSpacing, plantSpacing, bedLengthM]);

  const autoQuantity = layout.total > 0 ? layout.total : null;
  const displayQuantity = quantityOverride || (autoQuantity ? String(autoQuantity) : "");

  const family = selectedVariety?.crop_species?.crop_families?.name_da ?? null;
  const color = zoneColor(family);

  // Kompanionplante-feedback
  const companionFeedback = useMemo(
    () => getCompanionFeedback(family, existingZones),
    [family, existingZones]
  );

  // Udbytte-estimat
  const yieldEstimateKg = useMemo(() => {
    const count = quantityOverride ? Number(quantityOverride) : autoQuantity;
    if (!count || !family) return null;
    const kgPerPlant = YIELD_KG_PER_PLANT[family];
    if (!kgPerPlant) return null;
    return Math.round(count * kgPerPlant * 10) / 10;
  }, [autoQuantity, quantityOverride, family]);

  // Preview-zone: altid synlig, prikker tilføjes når afstand er sat
  const previewZone: PlantingZone = {
    id: "__preview__",
    cropName: cropName || query.split("·")[0]?.trim() || "Ny planting",
    varietyName: varietyName || null,
    family,
    offsetM,
    zoneLengthM: Math.min(zoneLengthM, bedLengthM - offsetM),
    rowSpacingCm: rowSpacing ? Number(rowSpacing) : null,
    plantSpacingCm: plantSpacing ? Number(plantSpacing) : null,
  };

  function reset() {
    setOpen(false);
    setQuery(""); setSelectedVariety(null); setCropName(""); setVarietyName("");
    setMethod("udplantet_eget"); setSowDate(""); setTransplantDate("");
    setPlantAgeWeeks(""); setExpectedHarvest(""); setHarvestOverride(false);
    setStatus("planlagt"); setNotes("");
    setRowSpacing(""); setPlantSpacing("");
    setOffsetM(firstFreeOffset(existingZones, bedLengthM));
    setZoneLengthM(bedLengthM);
    setQuantityOverride("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = cropName.trim() || query.split("·")[0]?.trim();
    if (!name) return;
    setSaving(true);

    const season = transplantDate
      ? new Date(transplantDate).getFullYear()
      : sowDate ? new Date(sowDate).getFullYear()
      : new Date().getFullYear();

    const qty = quantityOverride ? Number(quantityOverride) : autoQuantity;

    await supabase.from("bed_plantings").insert({
      bed_id: bedId,
      farm_id: farmId,
      variety_id: selectedVariety?.id ?? null,
      crop_name: name,
      variety: varietyName || null,
      method,
      sowed_at: sowDate || null,
      transplanted_at: transplantDate || null,
      plant_age_weeks_at_transplant: plantAgeWeeks ? Number(plantAgeWeeks) : null,
      expected_harvest_at: expectedHarvest || null,
      quantity_plants: qty || null,
      row_spacing_cm: rowSpacing ? Number(rowSpacing) : null,
      plant_spacing_cm: plantSpacing ? Number(plantSpacing) : null,
      bed_offset_m: offsetM,
      zone_length_m: Math.min(zoneLengthM, bedLengthM - offsetM),
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
        disabled={bedFull}
        title={bedFull ? "Bedet er fuldt — slet en eksisterende planting for at tilføje" : undefined}
      >
        <Plus size={16} />
        {bedFull ? "Bedet er fuldt" : "Tilføj planting"}
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
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); if (!e.target.value) clearVariety(); }}
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
                key={v.id} type="button" onClick={() => selectVariety(v)}
                className="w-full text-left px-3 py-2.5 hover:brightness-110 transition-all border-b border-white/5 last:border-0"
                style={{ background: "transparent" }}
              >
                <p className="text-sm text-earth-100">{v.name}</p>
                <p className="text-[10px] text-earth-500">
                  {v.crop_species?.name_da}
                  {v.crop_species?.crop_families?.name_da && ` · ${v.crop_species.crop_families.name_da}`}
                  {v.row_spacing_cm && ` · ${v.row_spacing_cm}×${v.plant_spacing_cm} cm`}
                </p>
              </button>
            ))}
          </div>
        )}
        {selectedVariety && (
          <div className="mt-1 text-[11px] flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
              {family ?? "Ukendt familie"}
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

        {/* Kompanionplante-rådgivning */}
        {companionFeedback.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {companionFeedback.map((fb, i) => (
              <div
                key={i}
                className="rounded-xl px-3 py-2 text-[11px]"
                style={{
                  background: fb.type === "good" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${fb.type === "good" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                  color: fb.type === "good" ? "#86efac" : "#fca5a5",
                }}
              >
                <p className="font-medium">
                  {fb.type === "good" ? "✓" : "⚠"} Naboskab med {fb.existingCropName}
                </p>
                <p className="mt-0.5 opacity-80">{fb.reason}</p>
                {fb.suggestion && (
                  <p className="mt-1 font-medium opacity-90">💡 {fb.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zone i bedet */}
      <div className="space-y-2">
        <label className="label">Zone i bedet</label>

        <BedLayoutSVG
          bedLengthM={bedLengthM}
          bedWidthM={bedWidthM}
          zones={existingZones}
          highlightZone={previewZone}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-[10px]">Fra (m fra ende)</label>
            <input
              type="number" step="0.5" min="0" max={bedLengthM - 0.5}
              className="input w-full mt-0.5 text-xs"
              value={offsetM}
              onChange={(e) => handleOffsetChange(Number(e.target.value))}
            />
            {freeIntervals.length > 1 && (
              <p className="text-[9px] text-earth-600 mt-0.5">
                Ledige start: {freeIntervals.map(s => `${s.start}m`).join(", ")}
              </p>
            )}
          </div>
          <div>
            <label className="label text-[10px]">Længde (m)</label>
            <input
              type="number" step="0.5" min="0.5" max={maxSlotLength || bedLengthM}
              className="input w-full mt-0.5 text-xs"
              value={zoneLengthM}
              onChange={(e) => setZoneLengthM(
                Math.max(0.5, Math.min(Number(e.target.value), maxSlotLength || bedLengthM))
              )}
            />
            {maxSlotLength > 0 && maxSlotLength < bedLengthM && (
              <p className="text-[9px] text-earth-600 mt-0.5">Maks {maxSlotLength}m i dette interval</p>
            )}
          </div>
        </div>
      </div>

      {/* Afstand */}
      <div>
        <label className="label">Afstand</label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <label className="label text-[10px]">Rækkeafstand (cm) — tværs af bedet</label>
            <input
              type="number" step="5" min="5"
              className="input w-full mt-0.5 text-xs"
              value={rowSpacing}
              onChange={(e) => setRowSpacing(e.target.value)}
              placeholder={selectedVariety?.row_spacing_cm ? String(selectedVariety.row_spacing_cm) : "60"}
            />
            {selectedVariety?.row_spacing_cm && rowSpacing !== String(selectedVariety.row_spacing_cm) && (
              <button
                type="button"
                className="text-[9px] text-earth-600 mt-0.5"
                onClick={() => setRowSpacing(String(selectedVariety.row_spacing_cm))}
              >
                ↺ anbefalet: {selectedVariety.row_spacing_cm} cm
              </button>
            )}
          </div>
          <div>
            <label className="label text-[10px]">Planteafstand (cm) — langs bedet</label>
            <input
              type="number" step="5" min="5"
              className="input w-full mt-0.5 text-xs"
              value={plantSpacing}
              onChange={(e) => setPlantSpacing(e.target.value)}
              placeholder={selectedVariety?.plant_spacing_cm ? String(selectedVariety.plant_spacing_cm) : "30"}
            />
            {selectedVariety?.plant_spacing_cm && plantSpacing !== String(selectedVariety.plant_spacing_cm) && (
              <button
                type="button"
                className="text-[9px] text-earth-600 mt-0.5"
                onClick={() => setPlantSpacing(String(selectedVariety.plant_spacing_cm))}
              >
                ↺ anbefalet: {selectedVariety.plant_spacing_cm} cm
              </button>
            )}
          </div>
        </div>

        {/* Beregnet antal */}
        {layout.total > 0 && (
          <div
            className="mt-3 rounded-xl px-3 py-2 flex items-center justify-between"
            style={{ background: "var(--surface-raised)" }}
          >
            <p className="text-xs text-earth-400">
              {layout.rows} {layout.rows === 1 ? "række" : "rækker"} ×{" "}
              {layout.plantsPerRow} {layout.plantsPerRow === 1 ? "plante" : "planter"}/række
            </p>
            <p className="text-sm font-bold" style={{ color }}>
              {layout.total} planter
            </p>
          </div>
        )}

        {/* Udbytte-estimat — vises så snart der er antal og en kendt familie */}
        {yieldEstimateKg !== null && (
          <div
            className="mt-2 rounded-xl px-3 py-2"
            style={{ background: "var(--surface-raised)" }}
          >
            <p className="text-xs text-earth-400">
              Forventet udbytte
            </p>
            <p className="text-sm font-semibold text-earth-200 mt-0.5">
              ca. {yieldEstimateKg}–{Math.round(yieldEstimateKg * 1.5 * 10) / 10} kg
              <span className="text-[10px] text-earth-600 font-normal ml-1">(groft estimat pr. plantefamilie)</span>
            </p>
          </div>
        )}

        {/* Antal override */}
        <div className="mt-2">
          <label className="label text-[10px]">
            Antal planter
            {autoQuantity && !quantityOverride && (
              <span className="text-earth-600 ml-1">(beregnet)</span>
            )}
          </label>
          <input
            type="number" min="1"
            className="input w-full mt-0.5 text-xs"
            value={displayQuantity}
            onChange={(e) => setQuantityOverride(e.target.value)}
            placeholder={autoQuantity ? String(autoQuantity) : "12"}
          />
          {quantityOverride && autoQuantity && Number(quantityOverride) !== autoQuantity && (
            <button
              type="button"
              className="text-[9px] text-earth-600 mt-0.5"
              onClick={() => setQuantityOverride("")}
            >
              ↺ brug beregnet: {autoQuantity}
            </button>
          )}
        </div>
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
            <button key={m.v} type="button"
              onClick={() => { setMethod(m.v); updateHarvest(m.v); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: method === m.v ? "var(--clay)" : "var(--surface-raised)", color: method === m.v ? "#fff" : "var(--text-muted)" }}
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
            <input type="date" className="input w-full mt-1" value={sowDate}
              onChange={(e) => { setSowDate(e.target.value); updateHarvest(method, e.target.value); }} />
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
                <input type="date" className="input w-full mt-1 text-xs" value={transplantDate}
                  onChange={(e) => { setTransplantDate(e.target.value); updateHarvest(method, sowDate, e.target.value); }} />
              </div>
            </div>
            <div>
              <label className="label">Planternes alder ved udplantning</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" min="1" max="52" className="input w-24"
                  value={plantAgeWeeks}
                  onChange={(e) => { setPlantAgeWeeks(e.target.value); updateHarvest(method, sowDate, transplantDate, e.target.value); }}
                  placeholder="8" />
                <span className="text-sm text-earth-400">uger</span>
                {selectedVariety?.weeks_to_transplant && (
                  <span className="text-xs text-earth-600">(standard: {selectedVariety.weeks_to_transplant} uger)</span>
                )}
              </div>
            </div>
          </>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className="label">Forventet høst</label>
            {expectedHarvest && !harvestOverride && (
              <button type="button" onClick={() => setHarvestOverride(true)} className="text-[10px] text-earth-500 hover:text-earth-300">
                Tilsidesæt beregning
              </button>
            )}
          </div>
          <input
            type="date" className="input w-full mt-1"
            value={expectedHarvest}
            onChange={(e) => { setExpectedHarvest(e.target.value); setHarvestOverride(true); }}
            readOnly={!!expectedHarvest && !harvestOverride}
            style={{ opacity: expectedHarvest && !harvestOverride ? 0.7 : 1 }}
          />
        </div>
      </div>

      {/* Status */}
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
        <label className="label">Noter</label>
        <textarea rows={2} className="input w-full mt-1 resize-none" value={notes}
          onChange={(e) => setNotes(e.target.value)} placeholder="Bemærkninger…" />
      </div>

      <button type="submit" disabled={saving || (!cropName.trim() && !query.trim())}
        className="btn-primary w-full disabled:opacity-40">
        {saving ? "Gemmer…" : "Tilføj planting"}
      </button>
    </form>
  );
}
