"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, Ruler, Check } from "lucide-react";

interface Field { id: string; name: string; area_ha: number; }

// JB-klassificering grupperet til planlæggeren
// Fulde JB1-10 beskrivelser findes på markkortet (EditSoilTypeForm)
const SOIL_TYPES = [
  { key: "JB1-2",  label: "JB1–2",  sub: "Grovsand / Finsand",       modifier: 1.4  },
  { key: "JB3-4",  label: "JB3–4",  sub: "Let lerblandet sand",       modifier: 1.15 },
  { key: "JB5-6",  label: "JB5–6",  sub: "Sandlerjord (standard)",    modifier: 1.0  },
  { key: "JB7-8",  label: "JB7–8",  sub: "Lerjord / Svær lerjord",   modifier: 0.85 },
  { key: "JB9-10", label: "JB9–10", sub: "Humusjord / Mosejord",      modifier: 0.72 },
];

// Mapper fulde JB-koder fra markkortet til planlaegger-grupper
function jbToGroup(jb: string | null): string {
  if (!jb) return "JB5-6";
  const n = parseInt(jb.replace("JB", ""));
  if (n <= 2) return "JB1-2";
  if (n <= 4) return "JB3-4";
  if (n <= 6) return "JB5-6";
  if (n <= 8) return "JB7-8";
  return "JB9-10";
}

const SEASONS = [
  { key: "forår",   label: "Forår",   sub: "mar–apr", days: 45 },
  { key: "sommer",  label: "Sommer",  sub: "maj–aug", days: 30 },
  { key: "efterår", label: "Efterår", sub: "sep–okt", days: 55 },
  { key: "vinter",  label: "Vinter",  sub: "nov–feb", days: 90 },
];

function monthToSeason(month: number): string {
  if (month >= 3 && month <= 4) return "forår";
  if (month >= 5 && month <= 8) return "sommer";
  if (month >= 9 && month <= 10) return "efterår";
  return "vinter";
}

function fmt(ha: number): string {
  if (ha < 0.1) return `${Math.round(ha * 10000)} m²`;
  return `${ha.toFixed(2)} ha`;
}

export default function RotationPlanner({
  fields,
  defaultAnimals,
  month,
  farmId,
  sectionCountByField,
}: {
  fields: Field[];
  defaultAnimals: number;
  month: number;
  farmId: string;
  sectionCountByField: Record<string, number>;
}) {
  const defaultField = fields[0] ?? null;
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(
    () => new Set(defaultField ? [defaultField.id] : [])
  );
  const [customHa, setCustomHa] = useState(defaultField?.area_ha ?? 2);
  const [season, setSeason] = useState(monthToSeason(month));

  // Parametre brugeren justerer
  const [animals, setAnimals]         = useState(Math.max(defaultAnimals, 5));
  const [grazeDays, setGrazeDays]     = useState(3);
  const [numSections, setNumSections] = useState(6);
  const [soilType, setSoilType]       = useState("JB5-6");

  const isCustom = selectedFieldIds.size === 0;
  const selectedFields = fields.filter(f => selectedFieldIds.has(f.id));
  const totalHa = isCustom
    ? customHa
    : selectedFields.reduce((sum, f) => sum + f.area_ha, 0);

  const soilModifier    = SOIL_TYPES.find(s => s.key === soilType)?.modifier ?? 1.0;
  const baseDays        = SEASONS.find(s => s.key === season)?.days ?? 30;
  const idealRestDays   = Math.round(baseDays * soilModifier);

  // Alt der vises er afledt — ingen skjulte variabler
  const sectionHa      = totalHa / numSections;
  const density        = sectionHa > 0 ? animals / sectionHa : 0;
  const actualRestDays = (numSections - 1) * grazeDays;
  const restRatio      = Math.min(1, actualRestDays / idealRestDays);

  // Øvre grænse for "god" tæthed skalerer med opholdstid:
  // Kortere perioder accepterer langt højere øjeblikstæthed (mob-effekten)
  const maxGoodDensity =
    grazeDays <= 1 ? 300 :
    grazeDays <= 2 ? 150 :
    grazeDays <= 4 ? 80  : 50;

  // Tæthedsniveau — relativt til opholdstid
  const densityLevel =
    density < 5               ? "low"     :
    density < 20              ? "ok"      :
    density < maxGoodDensity  ? "good"    :
    density < maxGoodDensity * 2 ? "high" :
    "extreme" as const;


  const densityLevelLabel =
    densityLevel === "low"     ? "For lav — ingen mob-effekt" :
    densityLevel === "ok"      ? "Let tæthed — under optimalt" :
    densityLevel === "good"    ? "God mob-tæthed" :
    densityLevel === "high"    ? "Høj tæthed — kræver hyppig flytning" :
                                 "Meget høj — daglig flytning nødvendig";

  const densityHint =
    densityLevel === "low"
      ? "For lav tæthed — mob-græsning kræver min. 5 dyr/ha for at have effekt. Gør sektionerne mindre."
    : densityLevel === "ok"
      ? `Let afgræsningstryk — under optimalt for mob-effekt. Anbefalet: 20–${maxGoodDensity} dyr/ha pr. sektion.`
    : densityLevel === "good"
      ? `God mob-tæthed med ${grazeDays === 1 ? "daglige" : `${grazeDays}-dages`} flytninger.`
    : densityLevel === "high"
      ? (grazeDays <= 2
          ? `Høj tæthed — fungerer fint med ${grazeDays === 1 ? "daglige" : "2-dages"} flytninger i intensiv mob-græsning.`
          : `${Math.round(density)} dyr/ha i ${grazeDays} dage er for intensivt — reducer til 1-2 dage pr. sektion eller lav sektionerne større.`)
    : /* extreme */
      (grazeDays <= 1
          ? `Meget høj øjeblikstæthed (${Math.round(density)} dyr/ha) — daglig flytning er absolut nødvendig. Hold øje med jordbunden.`
          : `${Math.round(density)} dyr/ha i ${grazeDays} dage er for intensivt — skift til daglig flytning eller lav langt større sektioner.`);

  // Tæthed er kun problematisk i kombination med lange ophold
  const verdict: "good" | "ok" | "tight" | "low" =
    density < 5                                    ? "low"  :
    density >= maxGoodDensity * 2 && grazeDays > 1 ? "tight" :
    restRatio >= 0.9                               ? "good" :
    restRatio >= 0.6                               ? "ok"   :
    "tight";

  const vs = {
    good:  { border: "border-grass-600" },
    ok:    { border: "border-amber-700" },
    tight: { border: "border-red-800"   },
    low:   { border: "border-sky-700"   },
  }[verdict];

  // Genveje — beregnet ud fra en af parametrene som prioritet
  const sectionsForIdealRest = Math.min(30, Math.ceil(idealRestDays / grazeDays) + 1);
  const balancedSections = (() => {
    let best = 2;
    let bestScore = -Infinity;
    for (let n = 2; n <= 30; n++) {
      const ha = totalHa / n;
      const d = animals / ha;
      const rest = (n - 1) * grazeDays;
      const restScore  = Math.min(1, rest / idealRestDays);
      const densScore  = d < 5 ? 0 : d < 20 ? 0.3 : d < maxGoodDensity ? 1 : d < maxGoodDensity * 2 ? 0.5 : 0.1;
      if (restScore * 0.6 + densScore * 0.4 > bestScore) {
        bestScore = restScore * 0.6 + densScore * 0.4;
        best = n;
      }
    }
    return best;
  })();

  function toggleField(id: string) {
    setSelectedFieldIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      const newTotal = fields.filter(f => next.has(f.id)).reduce((s, f) => s + f.area_ha, 0);
      if (newTotal > 0) {
        setNumSections(Math.min(30, Math.max(2, Math.floor(newTotal / Math.max(0.01, animals / 20)))));
      }
      return next;
    });
  }

  function selectCustom() {
    setSelectedFieldIds(new Set());
    setNumSections(Math.min(30, Math.max(2, Math.floor(customHa / Math.max(0.01, animals / 20)))));
  }

  return (
    <div className="space-y-4">

      {/* Areal + sæson */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-earth-50 text-sm">Areal og sæson</h3>

        {fields.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {fields.map(f => {
                const on = selectedFieldIds.has(f.id);
                return (
                  <button key={f.id} onClick={() => toggleField(f.id)}
                    className={`px-3 py-1.5 rounded-xl border text-sm transition-colors flex items-center gap-1.5 ${
                      on
                        ? "border-earth-200 text-earth-50 font-medium"
                        : "border-earth-700 text-earth-200"
                    }`}>
                    {on && <Check size={12} className="flex-shrink-0" />}
                    {f.name} · {f.area_ha} ha
                  </button>
                );
              })}
              <button onClick={selectCustom}
                className={`px-3 py-1.5 rounded-xl border text-sm transition-colors flex items-center gap-1.5 ${
                  isCustom
                    ? "border-earth-200 text-earth-50 font-medium"
                    : "border-earth-700 text-earth-200"
                }`}>
                {isCustom && <Check size={12} className="flex-shrink-0" />}
                Brugerdefineret
              </button>
            </div>
            {selectedFieldIds.size > 1 && (
              <p className="text-xs text-earth-300 mt-0.5">
                {selectedFieldIds.size} marker valgt · samlet areal: <strong className="text-earth-100">{totalHa.toFixed(2)} ha</strong>
              </p>
            )}
          </div>
        )}

        {isCustom && (
          <SliderRow
            label="Totalt areal"
            value={customHa}
            min={0.1} max={20} step={0.1}
            display={`${customHa.toFixed(1)} ha`}
            minLabel="0.1 ha" maxLabel="20 ha"
            onChange={v => {
              setCustomHa(v);
              setNumSections(n => Math.min(30, Math.max(2, Math.floor(v / Math.max(0.01, animals / 20)))));
            }}
          />
        )}

        <div>
          <label className="label text-xs">Sæson</label>
          <div className="grid grid-cols-2 gap-2">
            {SEASONS.map(s => (
              <button key={s.key} onClick={() => setSeason(s.key)}
                className={`py-2 px-3 rounded-xl border text-xs text-left transition-colors flex items-start gap-1.5 ${
                  season === s.key
                    ? "border-earth-200 text-earth-50"
                    : "border-earth-700 text-earth-200"
                }`}>
                <Check size={11} className={`flex-shrink-0 mt-0.5 transition-opacity ${season === s.key ? "opacity-100" : "opacity-0"}`} />
                <span>
                  <span className="font-medium block">{s.label}</span>
                  <span className="text-earth-300 font-normal">{s.sub} · {s.days} dage</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label text-xs">Jordtype (JB-klasse)</label>
          <div className="space-y-1.5">
            {SOIL_TYPES.map(s => (
              <button key={s.key} onClick={() => setSoilType(s.key)}
                className={`w-full py-2 px-3 rounded-xl border text-xs text-left transition-colors flex items-center gap-2 ${
                  soilType === s.key
                    ? "border-earth-200 text-earth-50"
                    : "border-earth-700 text-earth-200"
                }`}>
                <Check size={11} className={`flex-shrink-0 transition-opacity ${soilType === s.key ? "opacity-100" : "opacity-0"}`} />
                <span className="font-semibold w-14">{s.label}</span>
                <span className="text-earth-300 font-normal">{s.sub}</span>
              </button>
            ))}
          </div>
          {soilType !== "JB5-6" && (
            <p className="text-xs text-earth-300 mt-1.5">
              Justeret hvilemål: <strong className="text-earth-100">{idealRestDays} dage</strong> (basis {baseDays} × {soilModifier})
            </p>
          )}
        </div>
      </div>

      {/* De tre parametre */}
      <div className="card space-y-6">
        <h3 className="font-semibold text-earth-50 text-sm">Parametre</h3>

        <SliderRow
          label="Antal dyr i flokken"
          value={animals}
          min={1} max={200} step={1}
          display={`${animals} dyr`}
          minLabel="1" maxLabel="200"
          onChange={setAnimals}
          hint={`→ Tæthed pr. sektion: ${Math.round(density)} dyr/ha`}
        />

        <SliderRow
          label="Dage pr. sektion"
          value={grazeDays}
          min={1} max={7} step={1}
          display={`${grazeDays} ${grazeDays === 1 ? "dag" : "dage"}`}
          minLabel="1 dag" maxLabel="7 dage"
          onChange={setGrazeDays}
          hint={
            grazeDays <= 2 ? "Intensiv flytning — god til høj tæthed" :
            grazeDays <= 3 ? "Standard AMP-rytme" :
            grazeDays <= 4 ? "Praktisk — fx ved weekendflytning" :
            "Lang tid — risiko for selektiv afgræsning"
          }
        />

        <div>
          <SliderRow
            label="Antal sektioner"
            value={numSections}
            min={2} max={30} step={1}
            display={`${numSections}`}
            minLabel="2" maxLabel="30"
            onChange={setNumSections}
            hint={`→ Sektionsstørrelse: ${fmt(sectionHa)} pr. sektion`}
          />
          {/* Sektionsstørrelse-slider som alternativ måde at styre numSections */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs text-earth-300">Eller juster via sektionsstørrelse</span>
              <span className="text-sm font-semibold text-earth-100">{fmt(sectionHa)}</span>
            </div>
            <input type="range"
              min={Math.max(0.01, totalHa / 30)}
              max={totalHa / 2}
              step={0.005}
              value={Math.round(sectionHa * 1000) / 1000}
              onChange={e => {
                const ha = parseFloat(e.target.value);
                setNumSections(Math.max(2, Math.min(30, Math.floor(totalHa / ha))));
              }}
              className="w-full accent-earth-300" />
            <div className="flex justify-between text-xs text-earth-200 mt-0.5">
              <span>{fmt(totalHa / 30)}</span>
              <span>{fmt(totalHa / 2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resultater */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-earth-50 text-sm">Resultater</h3>

        {/* Nøgletal — visuel præsentation */}
        <div className="grid grid-cols-2 gap-3">
          {/* Belægningstryk */}
          <div className="rounded-xl p-3 border border-white/10 space-y-2">
            <p className="text-[10px] font-semibold text-earth-300 uppercase tracking-wide">Belægningstryk</p>
            <p className="text-2xl font-bold text-earth-50 leading-none">
              {Math.round(density)}
              <span className="text-xs font-normal text-earth-300 ml-1">dyr/ha</span>
            </p>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-earth-300 transition-all"
                style={{ width: `${Math.min(100, (density / Math.max(1, maxGoodDensity)) * 80)}%` }} />
            </div>
            <p className="text-[11px] text-earth-300 leading-snug">{densityLevelLabel}</p>
          </div>

          {/* Hviletid */}
          <div className="rounded-xl p-3 border border-white/10 space-y-2">
            <p className="text-[10px] font-semibold text-earth-300 uppercase tracking-wide">Hviletid</p>
            <p className="text-2xl font-bold text-earth-50 leading-none">
              {actualRestDays}
              <span className="text-xs font-normal text-earth-300 ml-1">dage</span>
            </p>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-earth-300 transition-all"
                style={{ width: `${Math.min(100, restRatio * 100)}%` }} />
            </div>
            <p className="text-[11px] text-earth-300 leading-snug">mål: {idealRestDays} dage</p>
          </div>
        </div>

        {/* Kontekst-hint */}
        <p className="text-xs text-earth-300">{densityHint}</p>

        {/* Forklaring */}
        <div className={`border-l-2 ${vs.border} pl-3 text-sm text-earth-200`}>
          {verdict === "good" && (
            <p className="flex items-start gap-1.5"><CheckCircle size={15} className="flex-shrink-0 mt-0.5 text-grass-500" /> God plan. {animals} dyr på {fmt(sectionHa)}-sektioner giver {Math.round(density)} dyr/ha og {actualRestDays} dages hvile.</p>
          )}
          {verdict === "ok" && (
            <p className="flex items-start gap-1.5"><AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> Hvilen er lidt kortere end anbefalet ({actualRestDays} af {idealRestDays} dage). Tilføj flere sektioner eller reducer dage pr. sektion.</p>
          )}
          {verdict === "tight" && (densityLevel === "high" || densityLevel === "extreme") && (
            <p className="flex items-start gap-1.5"><AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> {Math.round(density)} dyr/ha i {grazeDays} dage er for intensivt — lav sektionerne større eller skift til 1-2 dages perioder.</p>
          )}
          {verdict === "tight" && densityLevel !== "high" && densityLevel !== "extreme" && (
            <p className="flex items-start gap-1.5"><AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> For lidt hvile — {actualRestDays} af {idealRestDays} dage. Øg antal sektioner, reducer dage pr. sektion, eller brug et større areal.</p>
          )}
          {verdict === "low" && (
            <p>Tætheden er for lav ({Math.round(density)} dyr/ha). Gør sektionerne mindre eller tilføj flere dyr.</p>
          )}
        </div>

        {/* Genveje */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <p className="text-xs font-medium text-earth-300 uppercase tracking-wide mb-2">Hop til</p>

          <ShortcutButton
            title="Bedste balance"
            sub={`${balancedSections} sektioner à ${fmt(totalHa / balancedSections)} · ${(balancedSections - 1) * grazeDays} dages hvile`}
            highlight
            onClick={() => setNumSections(balancedSections)}
          />
          <ShortcutButton
            title={`Mest mulig hvile (${idealRestDays} dage)`}
            sub={`${sectionsForIdealRest} sektioner à ${fmt(totalHa / sectionsForIdealRest)}`}
            onClick={() => setNumSections(sectionsForIdealRest)}
          />
          <ShortcutButton
            title="Størst mulige sektioner (2 stk)"
            sub={`2 sektioner à ${fmt(totalHa / 2)} · ${grazeDays} dages hvile`}
            onClick={() => setNumSections(2)}
          />
        </div>

        {/* Opret sektioner */}
        {!isCustom && selectedFields.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <CreateSectionsPanel
              farmId={farmId}
              selectedFields={selectedFields}
              numSections={numSections}
              sectionCountByField={sectionCountByField}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hjælpekomponenter ────────────────────────────────────────────────────────

function SliderRow({
  label, value, min, max, step, display, minLabel, maxLabel, onChange, hint,
}: {
  label: string;
  value: number;
  min: number; max: number; step: number;
  display: string;
  minLabel: string; maxLabel: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-xs text-earth-200 font-medium">{label}</label>
        <span className="text-2xl font-bold text-earth-50">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full accent-earth-300" />
      <div className="flex justify-between text-xs text-earth-200 mt-0.5">
        <span>{minLabel}</span><span>{maxLabel}</span>
      </div>
      {hint && <p className="text-xs text-earth-300 mt-1">{hint}</p>}
    </div>
  );
}

// ── Opret sektioner ─────────────────────────────────────────────────────────

function CreateSectionsPanel({
  farmId, selectedFields, numSections, sectionCountByField,
}: {
  farmId: string;
  selectedFields: Field[];
  numSections: number;
  sectionCountByField: Record<string, number>;
}) {
  const [open, setOpen]       = useState(false);
  const [replace, setReplace] = useState(true);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const router = useRouter();

  const totalHa = selectedFields.reduce((s, f) => s + f.area_ha, 0);

  // Fordel sektioner proportionalt efter areal
  const rawCounts = selectedFields.map(f =>
    Math.max(1, Math.round(numSections * f.area_ha / totalHa))
  );
  const diff = numSections - rawCounts.reduce((s, c) => s + c, 0);
  if (diff !== 0) {
    const largest = selectedFields.reduce((mi, f, i) =>
      f.area_ha > selectedFields[mi].area_ha ? i : mi, 0);
    rawCounts[largest] = Math.max(1, rawCounts[largest] + diff);
  }

  const fieldPlans = selectedFields.map((f, i) => ({
    field: f,
    count: rawCounts[i],
    sectionHa: f.area_ha / rawCounts[i],
    existing: sectionCountByField[f.id] ?? 0,
  }));

  const hasExisting = fieldPlans.some(p => p.existing > 0);
  const multiField  = selectedFields.length > 1;

  async function create() {
    setLoading(true);
    const supabase = createClient();
    let globalIdx = 0;

    for (const plan of fieldPlans) {
      if (replace && plan.existing > 0) {
        await supabase.from("sections").delete().eq("field_id", plan.field.id);
      }
      const rows = Array.from({ length: plan.count }, (_, i) => ({
        field_id: plan.field.id,
        farm_id:  farmId,
        name:     multiField
          ? `${plan.field.name} ${i + 1}`
          : `Sektion ${globalIdx + i + 1}`,
        area_ha: Math.round(plan.sectionHa * 10000) / 10000,
      }));
      await supabase.from("sections").insert(rows);
      globalIdx += plan.count;
    }

    setLoading(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(99,107,60,0.15)", border: "1px solid rgba(99,107,60,0.3)" }}>
        <p className="text-sm text-grass-200 font-medium flex items-center gap-1.5"><CheckCircle size={15} /> {numSections} sektioner oprettet</p>
        <a href="/pastures" className="text-xs text-grass-200 underline">Se marker →</a>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full flex items-center justify-center gap-2">
        <Ruler size={15} />
        Opret {numSections} sektioner fra denne plan
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-earth-300 uppercase tracking-wide">Opret sektioner</p>

      {/* Fordeling pr. mark */}
      <div className="space-y-2">
        {fieldPlans.map(plan => (
          <div key={plan.field.id} className="bg-earth-800/60 rounded-xl px-4 py-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-earth-100">{plan.field.name}</span>
              <span className="text-sm text-earth-200">{plan.count} sektioner</span>
            </div>
            <p className="text-xs text-earth-200 mt-0.5">
              {plan.field.area_ha} ha ÷ {plan.count} = {fmt(plan.sectionHa)} pr. sektion
            </p>
            {plan.existing > 0 && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} />
                Har allerede {plan.existing} sektion{plan.existing !== 1 ? "er" : ""}
              </p>
            )}
          </div>
        ))}
      </div>

      {hasExisting && (
        <label className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer" style={{ background: "rgba(180,120,30,0.15)" }}>
          <input type="checkbox" checked={replace}
            onChange={e => setReplace(e.target.checked)}
            className="accent-amber-500 w-4 h-4 flex-shrink-0" />
          <span className="text-sm text-amber-400">Erstat eksisterende sektioner</span>
        </label>
      )}

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={create} disabled={loading} className="btn-primary flex-1">
          {loading ? "Opretter…" : `Opret ${numSections} sektioner`}
        </button>
      </div>
    </div>
  );
}

// ── Shortcut-knap ────────────────────────────────────────────────────────────

function ShortcutButton({ title, sub, onClick }: {
  title: string; sub: string; onClick: () => void; highlight?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-2.5 rounded-xl border border-earth-700 hover:border-earth-600 hover:bg-white/5 transition-colors">
      <p className="text-sm font-medium text-earth-100">{title}</p>
      <p className="text-xs mt-0.5 text-earth-300">{sub}</p>
    </button>
  );
}
