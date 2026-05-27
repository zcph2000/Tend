"use client";

import { useState, useMemo } from "react";
import {
  Search, ChevronLeft, ChevronRight, Lightbulb,
  AlertTriangle, CalendarDays, Sprout, Wind, Sun,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { calcLayout } from "@/lib/bedPlantingLayout";
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
  crop_species: { name_da: string; crop_families: { name_da: string } | null } | null;
};

type BedPlanting = {
  zone_length_m: number | null;
  bed_offset_m: number | null;
  status: string;
  crop_name: string;
  variety: string | null;
};

type BedOption = {
  id: string;
  name: string;
  length_m: number | null;
  width_m: number | null;
  location_type: string | null;
  bed_sections: { name: string } | null;
  bed_plantings: BedPlanting[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DA_MONTHS = [
  "", "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

// Plantefamilier der foretrækker varme / beskyttet miljø
const PREFERS_WARMTH = new Set(["Natskyggefamilien", "Græskarfamilien"]);

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "long" });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

function activePlantsInBed(bed: BedOption) {
  return (bed.bed_plantings ?? []).filter(
    p => p.status !== "fjernet" && p.status !== "høstet"
  );
}

function bedFreeM(bed: BedOption): number {
  const used = activePlantsInBed(bed).reduce((s, p) => s + (p.zone_length_m ?? 0), 0);
  return Math.max(0, Math.round(((bed.length_m ?? 0) - used) * 10) / 10);
}

function bedFreeIntervals(bed: BedOption): { start: number; end: number }[] {
  const bedLen = bed.length_m ?? 0;
  const occupied = activePlantsInBed(bed)
    .map(p => ({ start: p.bed_offset_m ?? 0, end: (p.bed_offset_m ?? 0) + (p.zone_length_m ?? 0) }))
    .sort((a, b) => a.start - b.start);
  const free: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const z of occupied) {
    if (z.start > cursor + 0.05) free.push({ start: Math.round(cursor * 10) / 10, end: Math.round(z.start * 10) / 10 });
    cursor = Math.max(cursor, z.end);
  }
  if (cursor < bedLen - 0.05) free.push({ start: Math.round(cursor * 10) / 10, end: bedLen });
  return free;
}

// ─── Component ───────────────────────────────────────────────────────────────

type Phase = "plan" | "bed";

export default function ForspiringsTool({
  farmId,
  varieties,
  beds,
}: {
  farmId: string;
  varieties: VarietyOption[];
  beds: BedOption[];
}) {
  const [phase, setPhase]   = useState<Phase>("plan");
  const [saving, setSaving] = useState(false);
  const router              = useRouter();
  const supabase            = createClient();

  // ── Phase 1: Planlæg ──────────────────────────────────────────────────
  const [query, setQuery]                 = useState("");
  const [selectedVariety, setVariety]     = useState<VarietyOption | null>(null);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [planMode, setPlanMode]           = useState<"fra_udplantning" | "fra_høst">("fra_udplantning");
  const [inputDate, setInputDate]         = useState("");
  const [sizeMode, setSizeMode]           = useState<"fra_zone" | "fra_kg">("fra_zone");
  const [zoneLengthM, setZoneLen]         = useState(2);
  const [rowSpacing, setRowSpacing]       = useState("");
  const [plantSpacing, setPlantSp]        = useState("");
  const [desiredKg, setDesiredKg]         = useState("");

  // ── Phase 2: Bed selection ────────────────────────────────────────────
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [bedOffsetM, setBedOffset]        = useState(0);
  const [bedZoneLen, setBedZoneLen]       = useState(2);
  const [addToCalendar, setAddCal]        = useState(true);

  // ── Derived variety data ────────────────────────────────────────────────
  const family = selectedVariety?.crop_species?.crop_families?.name_da ?? null;

  const daysToHarvest = useMemo(() => {
    if (selectedVariety?.days_to_harvest_transplant) return selectedVariety.days_to_harvest_transplant;
    if (family) return HARVEST_DAYS_FROM_TRANSPLANT[family] ?? null;
    return null;
  }, [selectedVariety, family]);

  const weeksToTransplant = selectedVariety?.weeks_to_transplant ?? 6;

  const effectiveRowSpacing   = rowSpacing   ? Number(rowSpacing)   : (selectedVariety?.row_spacing_cm   ?? 60);
  const effectivePlantSpacing = plantSpacing ? Number(plantSpacing) : (selectedVariety?.plant_spacing_cm ?? 30);

  // ── Date calculations ──────────────────────────────────────────────────
  const { transplantDate, sowDate, harvestDate } = useMemo(() => {
    if (!inputDate || !daysToHarvest) return { transplantDate: "", sowDate: "", harvestDate: "" };
    const sowOffset = -(weeksToTransplant * 7);
    if (planMode === "fra_udplantning") {
      return { transplantDate: inputDate, sowDate: addDays(inputDate, sowOffset), harvestDate: addDays(inputDate, daysToHarvest) };
    } else {
      const tx = addDays(inputDate, -daysToHarvest);
      return { transplantDate: tx, sowDate: addDays(tx, sowOffset), harvestDate: inputDate };
    }
  }, [inputDate, planMode, daysToHarvest, weeksToTransplant]);

  // ── Optimal window ─────────────────────────────────────────────────────
  const optimalSuggestion = useMemo(() => {
    if (!selectedVariety?.harvest_from_month || !daysToHarvest) return null;
    const now  = new Date();
    const hm   = selectedVariety.harvest_from_month;
    const hYear = hm < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
    const optHarvest    = `${hYear}-${String(hm).padStart(2, "0")}-15`;
    const optTransplant = addDays(optHarvest, -daysToHarvest);
    const optSow        = addDays(optTransplant, -(weeksToTransplant * 7));
    return { transplant: optTransplant, sow: optSow, harvest: optHarvest, monthName: DA_MONTHS[hm] };
  }, [selectedVariety, daysToHarvest, weeksToTransplant]);

  // ── Seasonal warning ───────────────────────────────────────────────────
  const windowWarning = useMemo(() => {
    if (!harvestDate || !selectedVariety?.harvest_from_month) return null;
    const hMonth = new Date(harvestDate).getMonth() + 1;
    const from = selectedVariety.harvest_from_month;
    const to   = selectedVariety.harvest_to_month ?? from;
    const inRange = from <= to ? hMonth >= from && hMonth <= to : hMonth >= from || hMonth <= to;
    return inRange ? null : `Høst i ${DA_MONTHS[hMonth]} er udenfor anbefalet vindue (${DA_MONTHS[from]}–${DA_MONTHS[to]})`;
  }, [harvestDate, selectedVariety]);

  const yieldKgPerPlant = family ? (YIELD_KG_PER_PLANT[family] ?? null) : null;

  // ── Reverse: desired kg → required zone length (skal ligge FØR layout) ─
  const requiredZoneM = useMemo(() => {
    if (!desiredKg || !yieldKgPerPlant || !effectivePlantSpacing || !effectiveRowSpacing) return null;
    const plantsNeeded = Math.ceil(Number(desiredKg) / yieldKgPerPlant);
    const rows         = Math.max(1, Math.floor((1.2 * 100) / effectiveRowSpacing));
    const plantsPerRow = Math.ceil(plantsNeeded / rows);
    return Math.round(plantsPerRow * (effectivePlantSpacing / 100) * 10) / 10;
  }, [desiredKg, yieldKgPerPlant, effectiveRowSpacing, effectivePlantSpacing]);

  // Hvilken zonelængde styrer beregningerne? Afhænger af valgt mode
  const effectiveZoneLen = sizeMode === "fra_kg" && requiredZoneM ? requiredZoneM : zoneLengthM;

  // ── Plant count + yield ────────────────────────────────────────────────
  const layout = useMemo(() => {
    const selectedBed = beds.find(b => b.id === selectedBedId);
    const widthM = phase === "bed" && selectedBed ? (selectedBed.width_m ?? 1.2) : 1.2;
    return calcLayout(widthM, {
      zoneLengthM:    phase === "bed" ? bedZoneLen : effectiveZoneLen,
      rowSpacingCm:   effectiveRowSpacing   || null,
      plantSpacingCm: effectivePlantSpacing || null,
    });
  }, [beds, selectedBedId, phase, bedZoneLen, effectiveZoneLen, effectiveRowSpacing, effectivePlantSpacing]);

  const yieldKg    = layout.total > 0 && yieldKgPerPlant ? Math.round(layout.total * yieldKgPerPlant * 10) / 10 : null;
  const seedsToBuy = layout.total > 0 ? Math.ceil(layout.total * 1.3) : null;

  // ── Sorted beds for Phase 2 ────────────────────────────────────────────
  const sortedBeds = useMemo(() => {
    const needsWarmth = family ? PREFERS_WARMTH.has(family) : false;
    return [...beds]
      .filter(b => (b.length_m ?? 0) > 0)
      .sort((a, b) => {
        // If warmth-loving: polytunnel/drivhus first
        if (needsWarmth) {
          const aWarm = a.location_type === "polytunnel" || a.location_type === "drivhus" ? 0 : 1;
          const bWarm = b.location_type === "polytunnel" || b.location_type === "drivhus" ? 0 : 1;
          if (aWarm !== bWarm) return aWarm - bWarm;
        }
        // Then by most free space
        return bedFreeM(b) - bedFreeM(a);
      });
  }, [beds, family]);

  // ── Filtered variety dropdown ──────────────────────────────────────────
  const filteredVarieties = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return varieties.slice(0, 30);
    return varieties.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.crop_species?.name_da.toLowerCase().includes(q) ||
      v.crop_species?.crop_families?.name_da.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [varieties, query]);

  // ── Handlers ──────────────────────────────────────────────────────────
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

  function selectBed(bed: BedOption) {
    setSelectedBedId(bed.id);
    const intervals = bedFreeIntervals(bed);
    const firstFree = intervals[0];
    if (firstFree) {
      setBedOffset(firstFree.start);
      const maxLen = firstFree.end - firstFree.start;
      setBedZoneLen(Math.min(zoneLengthM, Math.round(maxLen * 10) / 10));
    } else {
      setBedOffset(0);
      setBedZoneLen(Math.min(zoneLengthM, bed.length_m ?? 2));
    }
  }

  async function handleSave() {
    if (!selectedVariety || !transplantDate || !selectedBedId) return;
    const selectedBed = beds.find(b => b.id === selectedBedId);
    if (!selectedBed) return;

    setSaving(true);
    const cropName    = selectedVariety.crop_species?.name_da ?? selectedVariety.name;
    const varietyName = selectedVariety.name;
    const season      = new Date(transplantDate).getFullYear();
    const effectiveZone = Math.min(bedZoneLen, (selectedBed.length_m ?? bedZoneLen) - bedOffsetM);

    // 1. Create bed_planting
    await supabase.from("bed_plantings").insert({
      bed_id:              selectedBedId,
      farm_id:             farmId,
      variety_id:          selectedVariety.id,
      crop_name:           cropName,
      variety:             varietyName,
      method:              "udplantet_eget",
      sowed_at:            sowDate || null,
      transplanted_at:     transplantDate,
      expected_harvest_at: harvestDate || null,
      quantity_plants:     layout.total > 0 ? layout.total : null,
      row_spacing_cm:      effectiveRowSpacing || null,
      plant_spacing_cm:    effectivePlantSpacing || null,
      bed_offset_m:        bedOffsetM,
      zone_length_m:       effectiveZone,
      status:              "planlagt",
      season,
    });

    // 2. Create calendar tasks
    if (addToCalendar) {
      const todayStr = today();
      const buyDate  = sowDate ? (addDays(sowDate, -14) < todayStr ? todayStr : addDays(sowDate, -14)) : todayStr;

      const tasks: object[] = [
        {
          farm_id:     farmId,
          title:       `Køb ${seedsToBuy ?? layout.total} frø — ${cropName} · ${varietyName}`,
          due_date:    buyDate,
          category:    "økonomi",
          timing_type: "week",
          source_type: "planting",
        },
      ];
      if (sowDate) tasks.push({
        farm_id:     farmId,
        title:       `Sæt ${cropName} til at spire`,
        due_date:    sowDate,
        category:    "jordbrug",
        timing_type: "exact",
        source_type: "planting",
      });
      tasks.push({
        farm_id:     farmId,
        title:       `Udplant ${cropName} · ${varietyName} — ${selectedBed.name}`,
        due_date:    transplantDate,
        category:    "jordbrug",
        timing_type: "exact",
        source_type: "planting",
      });
      if (harvestDate) tasks.push({
        farm_id:     farmId,
        title:       `Høst ${cropName} · ${varietyName} — ${selectedBed.name}`,
        due_date:    harvestDate,
        category:    "jordbrug",
        timing_type: "week",
        source_type: "planting",
      });
      await supabase.from("farm_tasks").insert(tasks);
    }

    setSaving(false);
    router.push(`/jordbrug/bede/${selectedBedId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  const canProceed = !!selectedVariety && !!transplantDate;

  // ── PHASE 1: Planlæg ──────────────────────────────────────────────────
  if (phase === "plan") {
    return (
      <div className="space-y-4">

        {/* Variety search */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">
            1. Hvad vil du dyrke?
          </h2>

          <div className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-500" />
              <input
                className="input w-full pl-9"
                value={query}
                onChange={(e) => { if (selectedVariety) clearVariety(); setQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => { if (selectedVariety) clearVariety(); setShowDropdown(true); }}
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
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                {family && (
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(163,230,53,0.1)", color: "#a3e635" }}
                  >
                    {family}
                  </span>
                )}
                {daysToHarvest && (
                  <span className="text-earth-500">{daysToHarvest} dage fra udplantning til høst</span>
                )}
                {family && PREFERS_WARMTH.has(family) && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                    style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
                  >
                    <Sun size={9} />Foretrækker varme
                  </span>
                )}
                <button type="button" onClick={clearVariety} className="text-earth-600 hover:text-earth-400">
                  Skift sort
                </button>
              </div>
            )}
          </div>

          {/* Spacing */}
          {selectedVariety && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-[10px]">Rækkeafstand (cm)</label>
                <input type="number" step="5" min="5" className="input w-full mt-0.5 text-xs"
                  value={rowSpacing} onChange={e => setRowSpacing(e.target.value)}
                  placeholder={String(effectiveRowSpacing)} />
              </div>
              <div>
                <label className="label text-[10px]">Planteafstand (cm)</label>
                <input type="number" step="5" min="5" className="input w-full mt-0.5 text-xs"
                  value={plantSpacing} onChange={e => setPlantSp(e.target.value)}
                  placeholder={String(effectivePlantSpacing)} />
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">
            2. Hvornår?
          </h2>

          {/* Mode toggle */}
          <div className="flex gap-1">
            {([
              { v: "fra_udplantning" as const, l: "Fra udplantningsdato" },
              { v: "fra_høst"        as const, l: "Fra ønsket høstdato"  },
            ]).map(opt => (
              <button key={opt.v} type="button"
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

          <div>
            <label className="label">
              {planMode === "fra_udplantning" ? "Hvornår vil du plante ud?" : "Hvornår vil du høste?"}
            </label>
            <input type="date" className="input w-full mt-1 cursor-pointer"
              value={inputDate} onClick={openPicker}
              onChange={e => setInputDate(e.target.value)}
              min={today()} />
          </div>

          {/* Optimal window suggestion */}
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
                  Udplant {fmtDate(optimalSuggestion.transplant)} · høst {fmtDate(optimalSuggestion.harvest)}
                </p>
                <button type="button"
                  className="text-[11px] mt-1 underline"
                  style={{ color: "#a3e635" }}
                  onClick={() => { setPlanMode("fra_udplantning"); setInputDate(optimalSuggestion.transplant); }}
                >
                  Brug denne dato →
                </button>
              </div>
            </div>
          )}

          {/* Forspiringsoversigt */}
          {transplantDate && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
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
                      <p className="text-[10px] text-earth-500">efter {weeksToTransplant} uger som frøplante</p>
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
                        <p className="text-[10px] text-earth-500">ca. {daysToHarvest} dage efter udplantning</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#a3e635" }}>{fmtDate(harvestDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {windowWarning && (
            <div className="rounded-xl px-3 py-2 flex items-start gap-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-red-400" />
              <p className="text-[11px] text-red-400">{windowWarning}</p>
            </div>
          )}
        </div>

        {/* Size planning */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">
            3. Hvor meget?
          </h2>

          {/* Mode toggle */}
          <div className="flex gap-1">
            {([
              { v: "fra_zone" as const, l: "Fra tilgængelig plads" },
              { v: "fra_kg"   as const, l: "Fra ønsket udbytte"    },
            ]).map(opt => (
              <button key={opt.v} type="button"
                onClick={() => { setSizeMode(opt.v); setDesiredKg(""); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: sizeMode === opt.v ? "rgba(163,230,53,0.15)" : "var(--surface-raised)",
                  color:      sizeMode === opt.v ? "#a3e635" : "var(--text-muted)",
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {/* Single input based on mode */}
          {sizeMode === "fra_zone" ? (
            <div>
              <label className="label">Hvor mange meter vil du bruge?</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" step="0.5" min="0.5"
                  className="input flex-1"
                  value={zoneLengthM}
                  onChange={e => setZoneLen(Math.max(0.5, Number(e.target.value)))} />
                <span className="text-sm text-earth-500 flex-shrink-0">m af bedet</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Hvilket udbytte vil du ramme?</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" step="1" min="1"
                  className="input flex-1"
                  placeholder="fx 15"
                  value={desiredKg}
                  onChange={e => setDesiredKg(e.target.value)} />
                <span className="text-sm text-earth-500 flex-shrink-0">kg</span>
              </div>
              {requiredZoneM !== null && (
                <p className="text-xs mt-1.5" style={{ color: "#a3e635" }}>
                  Du skal bruge ca. <strong>{requiredZoneM} m</strong> af bedet
                </p>
              )}
              {desiredKg && !yieldKgPerPlant && (
                <p className="text-[11px] text-earth-600 mt-1">
                  Udbytteestimatet kræver en sort med en kendt plantefamilie
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {layout.total > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-earth-500"
                style={{ background: "var(--surface-raised)" }}>
                Hvad du skal bruge
              </p>
              <div className="divide-y divide-white/5">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <p className="text-xs text-earth-300">
                    Antal planter
                    <span className="text-earth-600 ml-1 text-[10px]">
                      ({layout.rows} rk × {layout.plantsPerRow} pl)
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
                      <p className="text-[10px] text-earth-600">groft estimat</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: "#a3e635" }}>
                      {yieldKg}–{Math.round(yieldKg * 1.5 * 10) / 10} kg
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Continue button */}
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => { setSelectedBedId(null); setPhase("bed"); }}
          className="w-full btn-primary py-3 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          Vælg bed
          <ChevronRight size={16} />
        </button>

        {!canProceed && (
          <p className="text-center text-[11px] text-earth-600">
            {!selectedVariety ? "Vælg en sort for at fortsætte" : "Vælg en dato for at fortsætte"}
          </p>
        )}
      </div>
    );
  }

  // ── PHASE 2: Vælg bed ─────────────────────────────────────────────────
  const selectedBed = beds.find(b => b.id === selectedBedId) ?? null;
  const freeIntervals = selectedBed ? bedFreeIntervals(selectedBed) : [];
  const needsWarmth = family ? PREFERS_WARMTH.has(family) : false;
  const cropName    = selectedVariety?.crop_species?.name_da ?? selectedVariety?.name ?? "";
  const varietyName = selectedVariety?.name ?? "";

  return (
    <div className="space-y-4">

      {/* Back + summary */}
      <button type="button" onClick={() => { setPhase("plan"); setSelectedBedId(null); }}
        className="flex items-center gap-1.5 text-sm text-earth-400 hover:text-earth-200 transition-colors -ml-1">
        <ChevronLeft size={16} />
        Tilbage til planlægning
      </button>

      {/* Plan summary chip */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-semibold text-earth-400 uppercase tracking-widest">Din plan</p>
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-earth-100">
              {cropName} · {varietyName}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-earth-400">
              {sowDate    && <span>🌱 Sår {fmtDate(sowDate)}</span>}
              {transplantDate && <span>🪴 Udplanter {fmtDate(transplantDate)}</span>}
              {harvestDate    && <span>🌾 Høster {fmtDate(harvestDate)}</span>}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                {layout.total > 0 ? `${layout.total} planter` : `${zoneLengthM} m`}
              </span>
              {seedsToBuy !== null && (
                <span className="px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(163,230,53,0.1)", color: "#a3e635" }}>
                  {seedsToBuy} frø at købe
                </span>
              )}
              {yieldKg !== null && (
                <span className="px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(163,230,53,0.08)", color: "#a3e635" }}>
                  ~{yieldKg}–{Math.round(yieldKg * 1.5 * 10) / 10} kg
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warmth tip */}
      {needsWarmth && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <Wind size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
          <div>
            <p className="text-xs font-medium" style={{ color: "#fbbf24" }}>
              {cropName} foretrækker varme
            </p>
            <p className="text-[11px] text-earth-400 mt-0.5">
              Overvej polytunnellen eller drivhuset hvis du har et — giver bedre udbytte og længere sæson.
            </p>
          </div>
        </div>
      )}

      {/* Bed list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-earth-500">
          Vælg bed
          {needsWarmth && <span className="ml-1 text-yellow-500">· Varm placering anbefales</span>}
        </p>

        {sortedBeds.length === 0 ? (
          <div className="px-4 pb-4 text-center">
            <p className="text-xs text-earth-500">Ingen bede registreret endnu</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sortedBeds.map(bed => {
              const freeM       = bedFreeM(bed);
              const isSelected  = bed.id === selectedBedId;
              const isWarm      = bed.location_type === "polytunnel" || bed.location_type === "drivhus";
              const hasRoom     = freeM >= 0.5;

              return (
                <div key={bed.id}>
                  <button
                    type="button"
                    onClick={() => hasRoom && selectBed(bed)}
                    disabled={!hasRoom}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                    style={{
                      background:   isSelected ? "rgba(163,230,53,0.08)" : "transparent",
                      opacity:      hasRoom ? 1 : 0.4,
                      cursor:       hasRoom ? "pointer" : "default",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-earth-100">{bed.name}</p>
                        {bed.bed_sections?.name && (
                          <span className="text-[10px] text-earth-500">{bed.bed_sections.name}</span>
                        )}
                        {isWarm && (
                          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                            {bed.location_type === "polytunnel" ? <Wind size={8} /> : <Sun size={8} />}
                            {bed.location_type === "polytunnel" ? "Polytunnel" : "Drivhus"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-earth-500 mt-0.5">
                        {bed.length_m && bed.width_m ? `${bed.length_m}×${bed.width_m} m · ` : ""}
                        {hasRoom
                          ? <span style={{ color: freeM >= zoneLengthM ? "#a3e635" : "var(--text-muted)" }}>{freeM} m ledigt</span>
                          : "Ingen plads"
                        }
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {isSelected
                        ? <span className="text-xs font-semibold" style={{ color: "#a3e635" }}>✓ Valgt</span>
                        : hasRoom && <ChevronRight size={14} className="text-earth-600" />
                      }
                    </div>
                  </button>

                  {/* Zone picker for selected bed */}
                  {isSelected && (
                    <div className="px-4 pb-3 space-y-2"
                      style={{ borderTop: "1px solid rgba(163,230,53,0.15)", background: "rgba(163,230,53,0.04)" }}>
                      <p className="text-[10px] text-earth-500 pt-2">
                        Zone i {bed.name}
                        {freeIntervals.length > 0 && (
                          <span> · Ledige intervaller: {freeIntervals.map(i => `${i.start}–${i.end} m`).join(", ")}</span>
                        )}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-[10px]">Fra (m fra ende)</label>
                          <input type="number" step="0.5" min="0"
                            max={Math.max(0, (bed.length_m ?? 0) - 0.5)}
                            className="input w-full mt-0.5 text-xs"
                            value={bedOffsetM}
                            onChange={e => setBedOffset(Math.max(0, Number(e.target.value)))} />
                        </div>
                        <div>
                          <label className="label text-[10px]">Zonelængde (m)</label>
                          <input type="number" step="0.5" min="0.5"
                            max={Math.max(0.5, (bed.length_m ?? 0) - bedOffsetM)}
                            className="input w-full mt-0.5 text-xs"
                            value={bedZoneLen}
                            onChange={e => setBedZoneLen(Math.max(0.5, Math.min(Number(e.target.value), (bed.length_m ?? 0) - bedOffsetM)))} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar toggle */}
      {selectedBedId && (
        <>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none"
            style={{
              background: addToCalendar ? "rgba(163,230,53,0.06)" : "var(--surface-raised)",
              border: `1px solid ${addToCalendar ? "rgba(163,230,53,0.2)" : "rgba(255,255,255,0.06)"}`,
            }}
            onClick={() => setAddCal(!addToCalendar)}
          >
            <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-colors"
              style={{ background: addToCalendar ? "#a3e635" : "rgba(255,255,255,0.1)" }}>
              {addToCalendar && <span className="text-[8px] text-black font-bold leading-none">✓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-earth-200">Opret opgaver i kalender</p>
              {addToCalendar && (
                <p className="text-[10px] text-earth-500 mt-0.5">
                  Køb frø · Sår · Udplanter · Høster
                </p>
              )}
            </div>
            <CalendarDays size={14} style={{ color: addToCalendar ? "#a3e635" : "var(--text-muted)" }} />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="w-full btn-primary py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Sprout size={16} />
            {saving ? "Opretter…" : "Opret planlagt plantning"}
          </button>
        </>
      )}
    </div>
  );
}
