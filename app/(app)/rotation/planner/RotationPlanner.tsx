"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Field { id: string; name: string; area_ha: number; }

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

  // De tre parametre brugeren justerer
  const [animals, setAnimals]     = useState(Math.max(defaultAnimals, 5));
  const [grazeDays, setGrazeDays] = useState(3);
  const [numSections, setNumSections] = useState(6);

  const isCustom = selectedFieldIds.size === 0;
  const selectedFields = fields.filter(f => selectedFieldIds.has(f.id));
  const totalHa = isCustom
    ? customHa
    : selectedFields.reduce((sum, f) => sum + f.area_ha, 0);

  const idealRestDays = SEASONS.find(s => s.key === season)?.days ?? 30;

  // Alt der vises er afledt — ingen skjulte variabler
  const sectionHa      = totalHa / numSections;
  const density        = sectionHa > 0 ? animals / sectionHa : 0;
  const actualRestDays = (numSections - 1) * grazeDays;
  const restRatio      = Math.min(1, actualRestDays / idealRestDays);

  // Gennemsnitlig belægning over hele arealet (ikke pr. sektion)
  const avgDensity = totalHa > 0 ? animals / totalHa : 0;

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

  const DENSITY_MAX = Math.max(300, Math.ceil(density / 100) * 100);
  const densityBarPct = Math.min(100, (density / DENSITY_MAX) * 100);
  const densityBarColor =
    densityLevel === "low"     ? "bg-sky-400"    :
    densityLevel === "ok"      ? "bg-amber-300"  :
    densityLevel === "good"    ? "bg-grass-500"  :
    densityLevel === "high"    ? "bg-orange-400" :
    "bg-red-500";
  const densityTextColor =
    densityLevel === "low"     ? "text-sky-600"    :
    densityLevel === "ok"      ? "text-amber-600"  :
    densityLevel === "good"    ? "text-grass-700"  :
    densityLevel === "high"    ? "text-orange-600" :
    "text-red-600";

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
    good:  { border: "border-grass-300", bg: "bg-grass-50", text: "text-grass-700" },
    ok:    { border: "border-amber-300", bg: "bg-amber-50", text: "text-amber-700" },
    tight: { border: "border-red-300",   bg: "bg-red-50",   text: "text-red-700"   },
    low:   { border: "border-sky-200",   bg: "bg-sky-50",   text: "text-sky-700"   },
  }[verdict];

  // Rest-farver er uafhængige af den samlede verdict
  const restTextColor =
    restRatio >= 0.9 ? "text-grass-700" :
    restRatio >= 0.6 ? "text-amber-600" :
    "text-red-600";
  const restBarColor =
    restRatio >= 0.9 ? "bg-grass-500" :
    restRatio >= 0.6 ? "bg-amber-400" :
    "bg-red-400";

  // Genveje — beregnet ud fra en af parametrene som prioritet
  const sectionsForIdealRest = Math.min(30, Math.ceil(idealRestDays / grazeDays) + 1);
  const sectionsForOptimalDensity = Math.max(2, Math.min(30, Math.floor(totalHa / Math.max(0.01, animals / 20))));

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
        <h3 className="font-semibold text-earth-900 text-sm">Areal og sæson</h3>

        {fields.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {fields.map(f => {
                const on = selectedFieldIds.has(f.id);
                return (
                  <button key={f.id} onClick={() => toggleField(f.id)}
                    className={`px-3 py-1.5 rounded-xl border-2 text-sm transition-colors flex items-center gap-1.5 ${
                      on
                        ? "border-grass-500 bg-grass-50 text-grass-700 font-medium"
                        : "border-earth-200 text-earth-600"
                    }`}>
                    {on && <span className="text-grass-500 text-xs">✓</span>}
                    {f.name} · {f.area_ha} ha
                  </button>
                );
              })}
              <button onClick={selectCustom}
                className={`px-3 py-1.5 rounded-xl border-2 text-sm transition-colors ${
                  isCustom
                    ? "border-grass-500 bg-grass-50 text-grass-700 font-medium"
                    : "border-earth-200 text-earth-600"
                }`}>
                Brugerdefineret
              </button>
            </div>
            {selectedFieldIds.size > 1 && (
              <p className="text-xs text-grass-700 bg-grass-50 rounded-lg px-3 py-1.5">
                {selectedFieldIds.size} marker valgt · samlet areal: <strong>{totalHa.toFixed(2)} ha</strong>
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
                className={`py-2 px-3 rounded-xl border-2 text-xs text-left transition-colors ${
                  season === s.key
                    ? "border-grass-500 bg-grass-50 text-grass-700 font-medium"
                    : "border-earth-200 text-earth-500"
                }`}>
                <span className="font-medium">{s.label}</span>
                <span className="block text-earth-400 font-normal">{s.sub} · {s.days} dages hvile</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* De tre parametre */}
      <div className="card space-y-6">
        <h3 className="font-semibold text-earth-900 text-sm">Parametre</h3>

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
          <div className="mt-3 pt-3 border-t border-earth-100">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs text-earth-500">Eller juster via sektionsstørrelse</span>
              <span className="text-sm font-semibold text-earth-700">{fmt(sectionHa)}</span>
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
              className="w-full accent-grass-600" />
            <div className="flex justify-between text-xs text-earth-400 mt-0.5">
              <span>{fmt(totalHa / 30)}</span>
              <span>{fmt(totalHa / 2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resultater */}
      <div className={`card border-2 ${vs.border} space-y-4`}>
        <h3 className="font-semibold text-earth-900 text-sm">Resultater</h3>

        {/* Nøgletal */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-earth-50 rounded-xl p-3 text-center">
            <p className={`text-3xl font-bold ${densityTextColor}`}>{Math.round(density)}</p>
            <p className="text-xs text-earth-500 mt-0.5">dyr/ha pr. sektion</p>
            <p className="text-xs text-earth-400 mt-0.5">({Math.round(avgDensity)} dyr/ha samlet)</p>
          </div>
          <div className="bg-earth-50 rounded-xl p-3 text-center">
            <p className={`text-3xl font-bold ${restTextColor}`}>{actualRestDays}</p>
            <p className="text-xs text-earth-500 mt-0.5">dages hvile</p>
          </div>
        </div>

        {/* Hvile-bar */}
        <div>
          <div className="flex justify-between text-xs text-earth-500 mb-1.5">
            <span>Hviletid pr. sektion</span>
            <span>Anbefalet: {idealRestDays} dage</span>
          </div>
          <div className="w-full bg-earth-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-150 ${restBarColor}`}
              style={{ width: `${restRatio * 100}%` }} />
          </div>
          <p className="text-xs text-earth-400 mt-1">
            ({numSections} sektioner − 1) × {grazeDays} dage = {actualRestDays} dage hvile
          </p>
        </div>

        {/* Tæthedsbjelke */}
        <div>
          <div className="flex justify-between text-xs text-earth-500 mb-1.5">
            <span>Øjeblikstæthed pr. sektion</span>
            <span>Optimalt ved {grazeDays === 1 ? "daglig" : `${grazeDays}-dages`} flytning: 20–{maxGoodDensity} dyr/ha</span>
          </div>
          <div className="relative w-full bg-earth-100 rounded-full h-3 overflow-hidden">
            {/* Grøn referencezone: 20 til maxGoodDensity */}
            <div className="absolute top-0 h-3 bg-grass-200"
              style={{ left: `${(20 / DENSITY_MAX) * 100}%`, width: `${((maxGoodDensity - 20) / DENSITY_MAX) * 100}%` }} />
            <div className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-150 ${densityBarColor}`}
              style={{ width: `${densityBarPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-earth-400 mt-0.5">
            <span>0</span>
            <span className="text-grass-600">20–{maxGoodDensity} dyr/ha</span>
            <span>{DENSITY_MAX}+</span>
          </div>
          <p className={`text-xs mt-1.5 rounded-lg px-3 py-1.5 ${
            densityLevel === "good"    ? "bg-grass-50 text-grass-700"   :
            densityLevel === "ok"      ? "bg-amber-50 text-amber-700"   :
            densityLevel === "low"     ? "bg-sky-50 text-sky-700"       :
            densityLevel === "high"    ? "bg-orange-50 text-orange-700" :
            "bg-red-50 text-red-700"
          }`}>{densityHint}</p>
        </div>

        {/* Forklaring */}
        <div className={`rounded-xl px-4 py-3 text-sm ${vs.bg} ${vs.text}`}>
          {verdict === "good" && (
            <p>✓ God plan. {animals} dyr på {fmt(sectionHa)}-sektioner giver {Math.round(density)} dyr/ha og {actualRestDays} dages hvile.</p>
          )}
          {verdict === "ok" && (
            <p>⚠️ Hvilen er lidt kortere end anbefalet ({actualRestDays} af {idealRestDays} dage). Tilføj flere sektioner eller reducer dage pr. sektion.</p>
          )}
          {verdict === "tight" && (densityLevel === "high" || densityLevel === "extreme") && (
            <p>⚠️ {Math.round(density)} dyr/ha i {grazeDays} dage er for intensivt — lav sektionerne større eller skift til 1-2 dages perioder.</p>
          )}
          {verdict === "tight" && densityLevel !== "high" && densityLevel !== "extreme" && (
            <p>⚠️ For lidt hvile — {actualRestDays} af {idealRestDays} dage. Øg antal sektioner, reducer dage pr. sektion, eller brug et større areal.</p>
          )}
          {verdict === "low" && (
            <p>Tætheden er for lav ({Math.round(density)} dyr/ha). Gør sektionerne mindre eller tilføj flere dyr.</p>
          )}
        </div>

        {/* Genveje */}
        <div className="space-y-2 pt-1 border-t border-earth-100">
          <p className="text-xs font-medium text-earth-500 uppercase tracking-wide mb-2">Hop til</p>

          <ShortcutButton
            title="✓ Bedste balance"
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
          <div className="pt-2 border-t border-earth-100">
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
        <label className="text-xs text-earth-600 font-medium">{label}</label>
        <span className="text-2xl font-bold text-earth-900">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full accent-grass-600" />
      <div className="flex justify-between text-xs text-earth-400 mt-0.5">
        <span>{minLabel}</span><span>{maxLabel}</span>
      </div>
      {hint && <p className="text-xs text-earth-400 mt-1.5 bg-earth-50 rounded-lg px-3 py-1.5">{hint}</p>}
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
      <div className="rounded-xl bg-grass-50 border border-grass-200 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-grass-700 font-medium">✓ {numSections} sektioner oprettet</p>
        <a href="/pastures" className="text-xs text-grass-600 underline">Se marker →</a>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-earth-300 text-sm text-earth-600 hover:border-grass-400 hover:text-grass-700 transition-colors">
        📐 Opret {numSections} sektioner fra denne plan
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-earth-500 uppercase tracking-wide">Opret sektioner</p>

      {/* Fordeling pr. mark */}
      <div className="space-y-2">
        {fieldPlans.map(plan => (
          <div key={plan.field.id} className="bg-earth-50 rounded-xl px-4 py-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-earth-800">{plan.field.name}</span>
              <span className="text-sm text-earth-600">{plan.count} sektioner</span>
            </div>
            <p className="text-xs text-earth-400 mt-0.5">
              {plan.field.area_ha} ha ÷ {plan.count} = {fmt(plan.sectionHa)} pr. sektion
            </p>
            {plan.existing > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Har allerede {plan.existing} sektion{plan.existing !== 1 ? "er" : ""}
              </p>
            )}
          </div>
        ))}
      </div>

      {hasExisting && (
        <label className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-xl cursor-pointer">
          <input type="checkbox" checked={replace}
            onChange={e => setReplace(e.target.checked)}
            className="accent-amber-600 w-4 h-4 flex-shrink-0" />
          <span className="text-sm text-amber-800">Erstat eksisterende sektioner</span>
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

function ShortcutButton({ title, sub, onClick, highlight }: {
  title: string; sub: string; onClick: () => void; highlight?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors ${
        highlight
          ? "bg-grass-50 border-grass-200 hover:bg-grass-100"
          : "bg-earth-50 border-transparent hover:bg-earth-100"
      }`}>
      <p className={`text-sm font-medium ${highlight ? "text-grass-800" : "text-earth-800"}`}>{title}</p>
      <p className={`text-xs mt-0.5 ${highlight ? "text-grass-600" : "text-earth-500"}`}>{sub}</p>
    </button>
  );
}
