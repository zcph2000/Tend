"use client";

import { useMemo, useState } from "react";
import {
  Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Trash2,
  Sprout, AlertTriangle, CheckCircle2, CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { calcLayout } from "@/lib/bedPlantingLayout";
import { HARVEST_DAYS_FROM_TRANSPLANT } from "@/lib/companionPlants";
import {
  type VarietyOption, type BedOption,
  addDays, fmtDate,
} from "@/lib/cropPlanning";
import { buildPlantingTaskRows } from "@/lib/plantingTasks";
import {
  allocateSeasonPlan,
  type PriorityDemandRow, type AllocationResult,
} from "@/lib/seasonPlanAllocator";

type Step = "list" | "review";

type EditableDates = { sow: string; transplant: string; harvest: string };

function recomputeDatesFromTransplant(variety: VarietyOption, transplantDate: string): EditableDates | null {
  const family = variety.crop_species?.crop_families?.name_da ?? null;
  const daysToHarvest = variety.days_to_harvest_transplant ?? (family ? HARVEST_DAYS_FROM_TRANSPLANT[family] ?? null : null);
  if (!daysToHarvest) return null;
  const weeksToTransplant = variety.weeks_to_transplant ?? 6;
  return {
    sow: addDays(transplantDate, -(weeksToTransplant * 7)),
    transplant: transplantDate,
    harvest: addDays(transplantDate, daysToHarvest),
  };
}

function coverageStyle(coverage: AllocationResult["coverage"]) {
  if (coverage === "full") return { bg: "rgba(163,230,53,0.12)", fg: "#a3e635", label: "Fuld dækning" };
  if (coverage === "partial") return { bg: "rgba(251,191,36,0.12)", fg: "#fbbf24", label: "Delvis dækning" };
  return { bg: "rgba(239,68,68,0.1)", fg: "#f87171", label: "Ikke dækket" };
}

export default function SeasonPlanTool({
  farmId,
  varieties,
  beds,
}: {
  farmId: string;
  varieties: VarietyOption[];
  beds: BedOption[];
}) {
  const [step, setStep] = useState<Step>("list");
  const [demand, setDemand] = useState<PriorityDemandRow[]>([]);
  const [results, setResults] = useState<AllocationResult[] | null>(null);
  const [dateOverrides, setDateOverrides] = useState<Record<string, EditableDates>>({});
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();

  const filteredVarieties = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return varieties.slice(0, 30);
    return varieties.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.crop_species?.name_da.toLowerCase().includes(q) ||
      v.crop_species?.crop_families?.name_da.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [varieties, query]);

  const demandById = useMemo(() => new Map(demand.map(r => [r.id, r])), [demand]);

  function addVariety(v: VarietyOption) {
    setDemand(d => [...d, { id: crypto.randomUUID(), variety: v, desiredKg: 0, priority: d.length + 1 }]);
    setQuery("");
    setShowDropdown(false);
  }

  function updateKg(id: string, kg: string) {
    setDemand(d => d.map(r => (r.id === id ? { ...r, desiredKg: Math.max(0, Number(kg) || 0) } : r)));
  }

  function removeRow(id: string) {
    setDemand(d => d.filter(r => r.id !== id).map((r, i) => ({ ...r, priority: i + 1 })));
  }

  function moveRow(index: number, dir: -1 | 1) {
    setDemand(d => {
      const next = [...d];
      const j = index + dir;
      if (j < 0 || j >= next.length) return d;
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((r, i) => ({ ...r, priority: i + 1 }));
    });
  }

  function handleCalculate() {
    const res = allocateSeasonPlan(demand, beds);
    setResults(res);
    setDateOverrides({});
    setStep("review");
  }

  function handleDateEdit(row: PriorityDemandRow, newTransplant: string) {
    const recomputed = recomputeDatesFromTransplant(row.variety, newTransplant);
    if (!recomputed) return;
    setDateOverrides(o => ({ ...o, [row.id]: recomputed }));
  }

  async function handleConfirm() {
    if (!results) return;
    setSaving(true);
    const supabase = createClient();

    for (const result of results) {
      if (result.chunks.length === 0) continue;
      const row = demandById.get(result.demandRowId);
      if (!row) continue;

      const variety = row.variety;
      const cropName = variety.crop_species?.name_da ?? variety.name;
      const varietyName = variety.name;
      const rowSpacing = variety.row_spacing_cm ?? 60;
      const plantSpacing = variety.plant_spacing_cm ?? 30;
      const dates = dateOverrides[row.id] ?? result.dates;
      const season = dates?.transplant ? new Date(dates.transplant).getFullYear() : new Date().getFullYear();

      let totalPlants = 0;
      const plantingRows: Record<string, unknown>[] = [];
      for (const chunk of result.chunks) {
        const bed = beds.find(b => b.id === chunk.bedId);
        const plants = calcLayout(bed?.width_m ?? 1.2, {
          zoneLengthM: chunk.zoneLengthM,
          rowSpacingCm: rowSpacing,
          plantSpacingCm: plantSpacing,
        }).total;
        totalPlants += plants;

        plantingRows.push({
          bed_id: chunk.bedId,
          farm_id: farmId,
          variety_id: variety.id,
          crop_name: cropName,
          variety: varietyName,
          method: "udplantet_eget",
          sowed_at: dates?.sow || null,
          transplanted_at: dates?.transplant || null,
          expected_harvest_at: dates?.harvest || null,
          quantity_plants: plants || null,
          row_spacing_cm: rowSpacing,
          plant_spacing_cm: plantSpacing,
          bed_offset_m: chunk.offsetM,
          zone_length_m: chunk.zoneLengthM,
          status: "planlagt",
          season,
        });
      }

      // Én batch-insert pr. afgrøde (typisk 1-3 rækker, én pr. bed den spænder over).
      const { data: insertedPlantings } = await supabase
        .from("bed_plantings")
        .insert(plantingRows)
        .select("id");

      // Kalenderopgaverne dækker hele afgrøden, men skal pege på ét konkret
      // bed_planting for at kunne ryddes op automatisk hvis den plantning
      // slettes igen — vælger den første (hvis afgrøden spænder over flere
      // bede, forbliver de øvrige plantningers rækker uden opgave-oprydning).
      const bedPlantingId = insertedPlantings?.[0]?.id ?? null;

      if (dates?.transplant) {
        const seedsToBuy = Math.ceil(totalPlants * 1.3);
        const taskRows = await buildPlantingTaskRows(supabase, {
          farmId,
          bedPlantingId,
          cropName,
          varietyName,
          varietyId: variety.id,
          status: "planlagt",
          seedsToBuy,
          sowDate: dates.sow || null,
          transplantDate: dates.transplant,
          harvestDate: dates.harvest || null,
        });
        if (taskRows.length > 0) await supabase.from("farm_tasks").insert(taskRows);
      }
    }

    setSaving(false);
    router.push("/farming/beds");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP: LIST
  // ═══════════════════════════════════════════════════════════════════════

  if (step === "list") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">
            Hvad har restauranten brug for?
          </h2>
          <p className="text-[11px] text-earth-500 -mt-2">
            Tilføj hver afgrøde med ønsket høst i kg for hele sæsonen. Listen gemmes ikke automatisk —
            bekræft planen for at oprette rigtige plantninger.
          </p>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-500" />
            <input
              className="input w-full pl-9"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Søg sort, art eller familie…"
            />
            {showDropdown && filteredVarieties.length > 0 && (
              <div
                className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-xl max-h-72 overflow-y-auto"
                style={{ background: "var(--surface-raised)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {filteredVarieties.map((v) => (
                  <button
                    key={v.id} type="button"
                    onClick={() => addVariety(v)}
                    className="w-full text-left px-3 py-2.5 hover:brightness-110 transition-all border-b border-white/5 last:border-0"
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
          </div>
        </div>

        {demand.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-earth-500">
              Behovsliste ({demand.length}) · prioritet 1 øverst
            </p>
            <div className="divide-y divide-white/5">
              {demand.map((row, i) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button type="button" disabled={i === 0} onClick={() => moveRow(i, -1)}
                      className="text-earth-500 hover:text-earth-200 disabled:opacity-20 transition-colors">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" disabled={i === demand.length - 1} onClick={() => moveRow(i, 1)}
                      className="text-earth-500 hover:text-earth-200 disabled:opacity-20 transition-colors">
                      <ArrowDown size={13} />
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-earth-600 w-4 flex-shrink-0">{row.priority}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-earth-100 truncate">
                      {row.variety.crop_species?.name_da ?? row.variety.name} · {row.variety.name}
                    </p>
                    {row.variety.crop_species?.crop_families?.name_da && (
                      <p className="text-[10px] text-earth-500">{row.variety.crop_species.crop_families.name_da}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input type="number" min="0" step="1"
                      className="input w-16 text-xs text-right"
                      value={row.desiredKg || ""}
                      placeholder="kg"
                      onChange={e => updateKg(row.id, e.target.value)} />
                    <span className="text-[10px] text-earth-500">kg</span>
                  </div>
                  <button type="button" onClick={() => removeRow(row.id)}
                    className="text-earth-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={demand.length === 0}
          onClick={handleCalculate}
          className="w-full btn-primary py-3 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          Beregn plan
          <ChevronRight size={16} />
        </button>
        {demand.length === 0 && (
          <p className="text-center text-[11px] text-earth-600">Tilføj mindst én afgrøde for at fortsætte</p>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP: REVIEW
  // ═══════════════════════════════════════════════════════════════════════

  const fullCount = results?.filter(r => r.coverage === "full").length ?? 0;

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setStep("list")}
        className="flex items-center gap-1.5 text-sm text-earth-400 hover:text-earth-200 transition-colors -ml-1">
        <ChevronLeft size={16} />
        Tilbage til behovsliste
      </button>

      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-semibold text-earth-400 uppercase tracking-widest">Samlet plan</p>
        <p className="text-sm text-earth-100 mt-1">
          {fullCount} af {results?.length ?? 0} afgrøder er fuldt dækket af den ledige bedplads
        </p>
      </div>

      <div className="space-y-3">
        {results?.map(result => {
          const row = demandById.get(result.demandRowId);
          if (!row) return null;
          const dates = dateOverrides[row.id] ?? result.dates;
          const style = coverageStyle(result.coverage);
          const cropName = row.variety.crop_species?.name_da ?? row.variety.name;

          return (
            <div key={result.demandRowId}
              className="rounded-2xl p-4 space-y-3"
              style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-earth-100">{cropName} · {row.variety.name}</p>
                  <p className="text-[11px] text-earth-500">
                    Prioritet {row.priority} · ønsket {row.desiredKg} kg
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ background: style.bg, color: style.fg }}>
                  {result.coverage === "full" ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  {style.label}{result.coverage !== "full" && ` · ${result.coveragePct}%`}
                </span>
              </div>

              {result.chunks.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {result.chunks.map((c, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                      {c.bedName}: {c.offsetM}–{Math.round((c.offsetM + c.zoneLengthM) * 10) / 10} m
                    </span>
                  ))}
                </div>
              ) : result.noYieldData ? (
                <p className="text-[11px] text-earth-600">
                  Denne sort mangler udbyttedata (kg/m²), så vi kan ikke regne ud hvor meget bedplads den kræver — det er ikke et pladsproblem.
                </p>
              ) : (
                <p className="text-[11px] text-earth-600">Ingen ledig plads fundet — hæv prioriteten eller frigør bedplads.</p>
              )}

              {result.coverage !== "full" && result.requiredZoneM > 0 && (
                <p className="text-[11px]" style={{ color: style.fg }}>
                  Kræver ca. {result.requiredZoneM} m i alt — kun {result.allocatedZoneM} m blev tildelt.
                </p>
              )}

              {dates ? (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="label text-[9px]">Sår</label>
                    <p className="text-[11px] text-earth-300 mt-0.5">{fmtDate(dates.sow)}</p>
                  </div>
                  <div>
                    <label className="label text-[9px]">Udplanter</label>
                    <input type="date" className="input w-full mt-0.5 text-[11px] py-1"
                      value={dates.transplant}
                      onChange={e => handleDateEdit(row, e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-[9px]">Høster</label>
                    <p className="text-[11px] mt-0.5" style={{ color: "#a3e635" }}>{fmtDate(dates.harvest)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-earth-600">
                  Ingen datoer kunne beregnes — sorten mangler høstvindue eller dage-til-høst.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleConfirm}
        className="w-full btn-primary py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Sprout size={16} />
        {saving ? "Opretter…" : "Bekræft plan"}
      </button>
      <p className="text-center text-[11px] text-earth-600 flex items-center justify-center gap-1">
        <CalendarDays size={11} />
        Opretter planlagte plantninger i bedene og opgaver i kalenderen
      </p>
    </div>
  );
}
