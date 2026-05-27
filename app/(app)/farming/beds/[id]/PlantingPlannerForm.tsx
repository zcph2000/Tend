"use client";

import { useState, useMemo } from "react";
import { Sprout, CalendarDays, ChevronUp, Search, AlertTriangle, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { calcLayout, zoneColor, type PlantingZone } from "@/lib/bedPlantingLayout";
import BedLayoutSVG from "./BedLayoutSVG";
import { YIELD_KG_PER_PLANT, HARVEST_DAYS_FROM_TRANSPLANT } from "@/lib/companionPlants";

// ─── Types ───────────────────────────────────────────────────────────────────

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

type PlanMode = "fra_udplantning" | "fra_høst";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "long" });
}

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

function firstFreeOffset(zones: PlantingZone[], bedLengthM: number): number {
  const occupied = [...zones].sort((a, b) => a.offsetM - b.offsetM);
  let cursor = 0;
  for (const z of occupied) {
    if (z.offsetM > cursor + 0.05) break;
    cursor = Math.max(cursor, z.offsetM + z.zoneLengthM);
  }
  return Math.min(cursor, bedLengthM);
}

const DA_MONTHS = [
  "", "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PlantingPlannerForm({
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
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const router                = useRouter();
  const supabase              = createClient();

  // Variety search
  const [query, setQuery]               = useState("");
  const [selectedVariety, setVariety]   = useState<VarietyOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Planning inputs
  const [planMode, setPlanMode]     = useState<PlanMode>("fra_udplantning");
  const [inputDate, setInputDate]   = useState("");
  const [offsetM, setOffsetM]       = useState(() => firstFreeOffset(existingZones, bedLengthM));
  const [zoneLengthM, setZoneLen]   = useState(Math.max(0.5, Math.min(2, bedLengthM)));
  const [rowSpacing, setRowSpacing] = useState("");
  const [plantSpacing, setPlantSp] = useState("");
  const [desiredKg, setDesiredKg]   = useState("");
  const [addToCalendar, setAddCal]  = useState(true);

  // ── Derived variety data ────────────────────────────────────────────────
  const family = selectedVariety?.crop_species?.crop_families?.name_da ?? null;
  const color  = zoneColor(family);

  const daysToHarvest = useMemo(() => {
    if (selectedVariety?.days_to_harvest_transplant) return selectedVariety.days_to_harvest_transplant;
    if (family) return HARVEST_DAYS_FROM_TRANSPLANT[family] ?? null;
    return null;
  }, [selectedVariety, family]);

  const weeksToTransplant = selectedVariety?.weeks_to_transplant ?? 6;

  const effectiveRowSpacing   = rowSpacing   ? Number(rowSpacing)   : (selectedVariety?.row_spacing_cm   ?? 60);
  const effectivePlantSpacing = plantSpacing ? Number(plantSpacing) : (selectedVariety?.plant_spacing_cm ?? 30);

  // ── Date calculations ───────────────────────────────────────────────────
  const { transplantDate, sowDate, harvestDate } = useMemo(() => {
    if (!inputDate || !daysToHarvest) return { transplantDate: "", sowDate: "", harvestDate: "" };
    const sowOffset = -(weeksToTransplant * 7);
    if (planMode === "fra_udplantning") {
      const tx  = inputDate;
      const sow = addDays(tx, sowOffset);
      const hv  = addDays(tx, daysToHarvest);
      return { transplantDate: tx, sowDate: sow, harvestDate: hv };
    } else {
      const hv  = inputDate;
      const tx  = addDays(hv, -daysToHarvest);
      const sow = addDays(tx, sowOffset);
      return { transplantDate: tx, sowDate: sow, harvestDate: hv };
    }
  }, [inputDate, planMode, daysToHarvest, weeksToTransplant]);

  // ── Optimal window suggestion ───────────────────────────────────────────
  const optimalSuggestion = useMemo(() => {
    if (!selectedVariety?.harvest_from_month || !daysToHarvest) return null;
    const now  = new Date();
    const hm   = selectedVariety.harvest_from_month;
    // Find the next occurrence of this harvest month
    const hYear = hm <= now.getMonth() + 1 && now.getMonth() >= hm - 1 && now.getDate() > 15
      ? now.getFullYear() + 1
      : hm < now.getMonth() + 1
        ? now.getFullYear() + 1
        : now.getFullYear();
    const optHarvest    = `${hYear}-${String(hm).padStart(2, "0")}-15`;
    const optTransplant = addDays(optHarvest, -daysToHarvest);
    const optSow        = addDays(optTransplant, -(weeksToTransplant * 7));
    return { transplant: optTransplant, sow: optSow, harvest: optHarvest, monthName: DA_MONTHS[hm] };
  }, [selectedVariety, daysToHarvest, weeksToTransplant]);

  // ── Seasonal window warning ─────────────────────────────────────────────
  const windowWarning = useMemo(() => {
    if (!harvestDate || !selectedVariety?.harvest_from_month) return null;
    const hMonth = new Date(harvestDate).getMonth() + 1;
    const from   = selectedVariety.harvest_from_month;
    const to     = selectedVariety.harvest_to_month ?? from;
    const inRange = from <= to
      ? hMonth >= from && hMonth <= to
      : hMonth >= from || hMonth <= to;
    return inRange
      ? null
      : `Høst i ${DA_MONTHS[hMonth]} er udenfor anbefalet vindue (${DA_MONTHS[from]}–${DA_MONTHS[to]})`;
  }, [harvestDate, selectedVariety]);

  // ── Plant count + yield ─────────────────────────────────────────────────
  const layout = useMemo(() => calcLayout(bedWidthM, {
    zoneLengthM:    Math.min(zoneLengthM, bedLengthM - offsetM),
    rowSpacingCm:   effectiveRowSpacing   || null,
    plantSpacingCm: effectivePlantSpacing || null,
  }), [bedWidthM, zoneLengthM, offsetM, effectiveRowSpacing, effectivePlantSpacing, bedLengthM]);

  const yieldKgPerPlant = family ? (YIELD_KG_PER_PLANT[family] ?? null) : null;
  const yieldKg         = layout.total > 0 && yieldKgPerPlant
    ? Math.round(layout.total * yieldKgPerPlant * 10) / 10
    : null;
  const seedsToBuy = layout.total > 0 ? Math.ceil(layout.total * 1.3) : null;

  // ── Reverse: desired kg → required zone length ─────────────────────────
  const requiredZoneLengthM = useMemo(() => {
    if (!desiredKg || !yieldKgPerPlant) return null;
    const plantsNeeded   = Math.ceil(Number(desiredKg) / yieldKgPerPlant);
    const rows           = Math.max(1, Math.floor((bedWidthM * 100) / effectiveRowSpacing));
    const plantsPerRow   = Math.ceil(plantsNeeded / rows);
    return Math.round(plantsPerRow * (effectivePlantSpacing / 100) * 10) / 10;
  }, [desiredKg, yieldKgPerPlant, bedWidthM, effectiveRowSpacing, effectivePlantSpacing]);

  // ── Filtered variety dropdown ───────────────────────────────────────────
  const filteredVarieties = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return varieties.slice(0, 30);
    return varieties.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.crop_species?.name_da.toLowerCase().includes(q) ||
      v.crop_species?.crop_families?.name_da.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [varieties, query]);

  // ── Preview zone for SVG ────────────────────────────────────────────────
  const previewZone: PlantingZone = {
    id:             "__planner__",
    cropName:       selectedVariety?.crop_species?.name_da ?? (query.split("·")[0]?.trim() || "Planlagt"),
    varietyName:    selectedVariety?.name ?? null,
    family,
    offsetM,
    zoneLengthM:    Math.min(zoneLengthM, bedLengthM - offsetM),
    rowSpacingCm:   effectiveRowSpacing   || null,
    plantSpacingCm: effectivePlantSpacing || null,
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  function selectVariety(v: VarietyOption) {
    setVariety(v);
    setQuery(`${v.crop_species?.name_da ?? ""} · ${v.name}`);
    setShowDropdown(false);
    if (v.row_spacing_cm)   setRowSpacing(String(v.row_spacing_cm));
    if (v.plant_spacing_cm) setPlantSp(String(v.plant_spacing_cm));
  }

  function clearVariety() {
    setVariety(null);
    setQuery("");
    setRowSpacing(""); setPlantSp("");
  }

  function reset() {
    setOpen(false);
    clearVariety();
    setInputDate("");
    setPlanMode("fra_udplantning");
    setZoneLen(Math.max(0.5, Math.min(2, bedLengthM)));
    setOffsetM(firstFreeOffset(existingZones, bedLengthM));
    setRowSpacing(""); setPlantSp("");
    setDesiredKg("");
    setAddCal(true);
  }

  async function handleSave() {
    if (!selectedVariety || !transplantDate) return;
    setSaving(true);

    const cropName    = selectedVariety.crop_species?.name_da ?? selectedVariety.name;
    const varietyName = selectedVariety.name;
    const season      = new Date(transplantDate).getFullYear();
    const effectiveZone = Math.min(zoneLengthM, bedLengthM - offsetM);
    const qty = layout.total > 0 ? layout.total : null;

    // 1. Create bed_planting with status='planlagt'
    await supabase.from("bed_plantings").insert({
      bed_id:               bedId,
      farm_id:              farmId,
      variety_id:           selectedVariety.id,
      crop_name:            cropName,
      variety:              varietyName,
      method:               "udplantet_eget",
      sowed_at:             sowDate || null,
      transplanted_at:      transplantDate,
      expected_harvest_at:  harvestDate || null,
      quantity_plants:      qty,
      row_spacing_cm:       effectiveRowSpacing   || null,
      plant_spacing_cm:     effectivePlantSpacing || null,
      bed_offset_m:         offsetM,
      zone_length_m:        effectiveZone,
      status:               "planlagt",
      season,
    });

    // 2. Optionally create farm_tasks
    if (addToCalendar) {
      const tasks: object[] = [];
      if (sowDate) tasks.push({
        farm_id:     farmId,
        title:       `Sæt ${cropName} til at spire`,
        due_date:    sowDate,
        category:    "jordbrug",
        timing_type: "exact",
        source_type: "planting",
      });
      if (transplantDate) tasks.push({
        farm_id:     farmId,
        title:       `Udplant ${cropName} · ${varietyName}`,
        due_date:    transplantDate,
        category:    "jordbrug",
        timing_type: "exact",
        source_type: "planting",
      });
      if (harvestDate) tasks.push({
        farm_id:     farmId,
        title:       `Høst ${cropName} · ${varietyName}`,
        due_date:    harvestDate,
        category:    "jordbrug",
        timing_type: "week",
        source_type: "planting",
      });
      if (tasks.length) await supabase.from("farm_tasks").insert(tasks);
    }

    setSaving(false);
    reset();
    router.refresh();
  }

  const canSave = !!selectedVariety && !!transplantDate;

  // ── Collapsed button ────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm transition-colors"
        style={{
          border:     "1px dashed rgba(163,230,53,0.3)",
          color:      "#a3e635",
          background: "rgba(163,230,53,0.04)",
        }}
      >
        <Sprout size={15} />
        Planlæg forspiring
      </button>
    );
  }

  // ── Expanded form ───────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid rgba(163,230,53,0.2)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout size={15} style={{ color: "#a3e635" }} />
          <h3 className="font-semibold text-earth-100 text-sm">Forspiringsoverblik</h3>
        </div>
        <button type="button" onClick={reset}>
          <ChevronUp size={16} className="text-earth-400" />
        </button>
      </div>

      {/* ── Variety search ── */}
      <div className="relative">
        <label className="label">Afgrøde / sort</label>
        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-500" />
          <input
            className="input w-full pl-9"
            value={query}
            onChange={(e) => {
              if (selectedVariety) clearVariety();
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (selectedVariety) { clearVariety(); }
              setShowDropdown(true);
            }}
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
                key={v.id} type="button"
                onClick={() => selectVariety(v)}
                className="w-full text-left px-3 py-2.5 hover:brightness-110 transition-all border-b border-white/5 last:border-0"
              >
                <p className="text-sm text-earth-100">{v.name}</p>
                <p className="text-[10px] text-earth-500">
                  {v.crop_species?.name_da}
                  {v.crop_species?.crop_families?.name_da && ` · ${v.crop_species.crop_families.name_da}`}
                  {v.weeks_to_transplant && ` · ${v.weeks_to_transplant} uger til udplantning`}
                  {v.days_to_harvest_transplant && ` · ${v.days_to_harvest_transplant} dage til høst`}
                </p>
              </button>
            ))}
          </div>
        )}

        {selectedVariety && (
          <div className="mt-1.5 flex items-center gap-2 text-[11px] flex-wrap">
            <span className="px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
              {family ?? "Ukendt familie"}
            </span>
            {daysToHarvest && (
              <span className="text-earth-500">{daysToHarvest} dage fra udplantning til høst</span>
            )}
            <button type="button" onClick={clearVariety} className="text-earth-600 hover:text-earth-400">
              Skift sort
            </button>
          </div>
        )}
      </div>

      {/* ── Plan mode toggle ── */}
      <div>
        <label className="label">Planlæg fra</label>
        <div className="flex gap-1 mt-1">
          {([
            { v: "fra_udplantning" as PlanMode, l: "Udplantningsdato" },
            { v: "fra_høst"        as PlanMode, l: "Ønsket høstdato"  },
          ]).map(opt => (
            <button
              key={opt.v} type="button"
              onClick={() => { setPlanMode(opt.v); setInputDate(""); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: planMode === opt.v ? "rgba(163,230,53,0.15)" : "var(--surface-raised)",
                color:      planMode === opt.v ? "#a3e635" : "var(--text-muted)",
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Date input ── */}
      <div>
        <label className="label">
          {planMode === "fra_udplantning" ? "Hvornår vil du plante ud?" : "Hvornår vil du høste?"}
        </label>
        <input
          type="date"
          className="input w-full mt-1 cursor-pointer"
          value={inputDate}
          onClick={openPicker}
          onChange={(e) => setInputDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
        />
      </div>

      {/* ── Optimal window suggestion ── */}
      {selectedVariety && optimalSuggestion && !inputDate && (
        <div
          className="rounded-xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.2)" }}
        >
          <Lightbulb size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#a3e635" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "#a3e635" }}>
              Optimalt: høst i {optimalSuggestion.monthName}
            </p>
            <p className="text-[11px] text-earth-400 mt-0.5">
              Udplant {fmtDate(optimalSuggestion.transplant)} → høst {fmtDate(optimalSuggestion.harvest)}
            </p>
            <button
              type="button"
              className="text-[11px] mt-1 underline"
              style={{ color: "#a3e635" }}
              onClick={() => {
                setPlanMode("fra_udplantning");
                setInputDate(optimalSuggestion.transplant);
              }}
            >
              Brug denne dato →
            </button>
          </div>
        </div>
      )}

      {/* ── Calculation result: Forspiringsoversigt ── */}
      {transplantDate && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p
            className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-earth-500"
            style={{ background: "var(--surface-raised)" }}
          >
            Din forspiringsoversigt
          </p>
          <div className="divide-y divide-white/5">
            {sowDate && (
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">🌱</span>
                  <div>
                    <p className="text-xs font-medium text-earth-200">Sæt til at spire</p>
                    <p className="text-[10px] text-earth-500">drivhus / vindueskarm</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-earth-100">{fmtDate(sowDate)}</p>
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-lg leading-none">🪴</span>
                <div>
                  <p className="text-xs font-medium text-earth-200">Udplant i bedet</p>
                  <p className="text-[10px] text-earth-500">
                    efter {weeksToTransplant} uger som frøplante
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-earth-100">{fmtDate(transplantDate)}</p>
            </div>
            {harvestDate && (
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">🌾</span>
                  <div>
                    <p className="text-xs font-medium text-earth-200">Forventet høst</p>
                    <p className="text-[10px] text-earth-500">
                      ca. {daysToHarvest} dage efter udplantning
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold" style={{ color: "#a3e635" }}>
                  {fmtDate(harvestDate)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Seasonal window warning ── */}
      {windowWarning && (
        <div
          className="rounded-xl px-3 py-2 flex items-start gap-2"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-red-400" />
          <p className="text-[11px] text-red-400">{windowWarning}</p>
        </div>
      )}

      {/* ── Zone in bed ── */}
      <div className="space-y-2">
        <label className="label">Zone i bedet</label>
        {bedLengthM > 0 && bedWidthM > 0 && (
          <BedLayoutSVG
            bedLengthM={bedLengthM}
            bedWidthM={bedWidthM}
            zones={existingZones}
            highlightZone={previewZone}
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label text-[10px]">Fra (m fra ende)</label>
            <input
              type="number" step="0.5" min="0" max={bedLengthM - 0.5}
              className="input w-full mt-0.5 text-xs"
              value={offsetM}
              onChange={(e) => setOffsetM(Math.max(0, Math.min(Number(e.target.value), bedLengthM - 0.5)))}
            />
          </div>
          <div>
            <label className="label text-[10px]">Zonelængde (m)</label>
            <input
              type="number" step="0.5" min="0.5" max={bedLengthM - offsetM}
              className="input w-full mt-0.5 text-xs"
              value={zoneLengthM}
              onChange={(e) => setZoneLen(Math.max(0.5, Math.min(Number(e.target.value), bedLengthM - offsetM)))}
            />
          </div>
        </div>
      </div>

      {/* ── Spacing ── */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Rækkeafstand (cm)</label>
          <input
            type="number" step="5" min="5"
            className="input w-full mt-0.5 text-xs"
            value={rowSpacing}
            onChange={(e) => setRowSpacing(e.target.value)}
            placeholder={String(effectiveRowSpacing)}
          />
          {selectedVariety?.row_spacing_cm && rowSpacing && rowSpacing !== String(selectedVariety.row_spacing_cm) && (
            <button type="button" className="text-[9px] text-earth-600 mt-0.5"
              onClick={() => setRowSpacing(String(selectedVariety.row_spacing_cm))}>
              ↺ anbefalet: {selectedVariety.row_spacing_cm} cm
            </button>
          )}
        </div>
        <div>
          <label className="label text-[10px]">Planteafstand (cm)</label>
          <input
            type="number" step="5" min="5"
            className="input w-full mt-0.5 text-xs"
            value={plantSpacing}
            onChange={(e) => setPlantSp(e.target.value)}
            placeholder={String(effectivePlantSpacing)}
          />
          {selectedVariety?.plant_spacing_cm && plantSpacing && plantSpacing !== String(selectedVariety.plant_spacing_cm) && (
            <button type="button" className="text-[9px] text-earth-600 mt-0.5"
              onClick={() => setPlantSp(String(selectedVariety.plant_spacing_cm))}>
              ↺ anbefalet: {selectedVariety.plant_spacing_cm} cm
            </button>
          )}
        </div>
      </div>

      {/* ── What you need ── */}
      {layout.total > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p
            className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-earth-500"
            style={{ background: "var(--surface-raised)" }}
          >
            Hvad du skal bruge
          </p>
          <div className="divide-y divide-white/5">
            <div className="flex items-center justify-between px-3 py-2.5">
              <p className="text-xs text-earth-300">
                Antal planter
                <span className="text-earth-600 ml-1 text-[10px]">
                  ({layout.rows} rk × {layout.plantsPerRow} pl/rk)
                </span>
              </p>
              <p className="text-sm font-bold text-earth-100">{layout.total} stk</p>
            </div>
            {seedsToBuy !== null && (
              <div className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <p className="text-xs text-earth-300">Frø at købe</p>
                  <p className="text-[10px] text-earth-600">+30% spiringsbuffer</p>
                </div>
                <p className="text-sm font-bold" style={{ color: "#a3e635" }}>{seedsToBuy} frø</p>
              </div>
            )}
            {yieldKg !== null && (
              <div className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <p className="text-xs text-earth-300">Forventet udbytte</p>
                  <p className="text-[10px] text-earth-600">groft estimat pr. plantefamilie</p>
                </div>
                <p className="text-sm font-bold" style={{ color: "#a3e635" }}>
                  {yieldKg}–{Math.round(yieldKg * 1.5 * 10) / 10} kg
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reverse: desired kg → zone length ── */}
      {yieldKgPerPlant !== null && (
        <div>
          <label className="label text-[10px]">Har du et udbytte du vil ramme?</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number" step="1" min="1"
              className="input flex-1 text-xs"
              placeholder="fx 15 kg"
              value={desiredKg}
              onChange={(e) => setDesiredKg(e.target.value)}
            />
            <span className="text-xs text-earth-500 flex-shrink-0">kg</span>
          </div>
          {requiredZoneLengthM !== null && (
            <div
              className="mt-1.5 rounded-lg px-3 py-2 flex items-center justify-between"
              style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)" }}
            >
              <p className="text-xs text-earth-400">Du skal bruge ca.</p>
              <p className="text-sm font-bold" style={{ color: "#a3e635" }}>
                {requiredZoneLengthM} m af bedet
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Add to calendar toggle ── */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none"
        style={{
          background: addToCalendar ? "rgba(163,230,53,0.06)" : "var(--surface-raised)",
          border:     `1px solid ${addToCalendar ? "rgba(163,230,53,0.2)" : "rgba(255,255,255,0.06)"}`,
        }}
        onClick={() => setAddCal(!addToCalendar)}
      >
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
          style={{ background: addToCalendar ? "#a3e635" : "rgba(255,255,255,0.1)" }}
        >
          {addToCalendar && <span className="text-[8px] text-black font-bold leading-none">✓</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-earth-200">Tilføj datoer til kalender</p>
          {addToCalendar && sowDate && transplantDate && (
            <p className="text-[10px] text-earth-500 mt-0.5 truncate">
              Sår {fmtDate(sowDate)} · Udplanter {fmtDate(transplantDate)}
              {harvestDate ? ` · Høster ${fmtDate(harvestDate)}` : ""}
            </p>
          )}
        </div>
        <CalendarDays size={14} style={{ color: addToCalendar ? "#a3e635" : "var(--text-muted)" }} />
      </div>

      {/* ── Save button ── */}
      <button
        type="button"
        disabled={saving || !canSave}
        onClick={handleSave}
        className="w-full btn-primary py-2.5 text-sm disabled:opacity-40"
      >
        {saving ? "Opretter…" : "Opret planlagt plantning"}
      </button>
    </div>
  );
}
