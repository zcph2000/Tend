import { createClient } from "@/lib/supabase/server";
import { formatDate, daysSince, getGrazingRecommendation, getOptimalSectionSize } from "@/lib/utils";
import MoveFlockButton from "./MoveFlockButton";
import Link from "next/link";
import { PawPrint, AlertTriangle, ChevronRight, Lightbulb, CheckCircle, Ruler } from "lucide-react";

export default async function RotationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("*").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const { data: sections } = await supabase
    .from("sections")
    .select("*, field:fields(name, area_ha)")
    .eq("farm_id", farm.id)
    .order("name");

  const { data: flockRows } = await supabase
    .from("flocks")
    .select("id, name, notes, current_section_id, moved_in_date")
    .eq("farm_id", farm.id)
    .order("name");

  const { data: flockAnimals } = await supabase
    .from("animals")
    .select("flock_id")
    .eq("farm_id", farm.id)
    .eq("status", "active")
    .not("flock_id", "is", null);

  const animalCountByFlock = (flockAnimals ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
    return acc;
  }, {});

  const flocks = (flockRows ?? []).map(f => ({
    ...f,
    animal_count: animalCountByFlock[f.id] ?? 0,
  }));

  const { data: activeGrazingRows } = await supabase
    .from("grazing_records")
    .select("*, section:sections(name, area_ha)")
    .eq("farm_id", farm.id)
    .is("end_date", null)
    .order("start_date", { ascending: false });

  type GrazingRow = NonNullable<typeof activeGrazingRows>[number];
  const activeByFlock: Record<string, GrazingRow> = {};
  for (const rec of activeGrazingRows ?? []) {
    if (rec.flock_id && !activeByFlock[rec.flock_id]) {
      activeByFlock[rec.flock_id] = rec;
    }
  }

  const activeGrazingIds: Record<string, string> = {};
  for (const [flockId, rec] of Object.entries(activeByFlock)) {
    activeGrazingIds[flockId] = rec.id;
  }

  const { data: grazingHistory } = await supabase
    .from("grazing_records")
    .select("*, section:sections(id, name)")
    .eq("farm_id", farm.id)
    .not("end_date", "is", null)
    .order("end_date", { ascending: false })
    .limit(50);

  const month = new Date().getMonth() + 1;
  const totalHa = sections?.reduce((s, sec) => s + sec.area_ha, 0) ?? 0;
  const totalAnimals = flocks.reduce((s, f) => s + f.animal_count, 0);

  const sectionsWithStatus = (sections ?? []).map(section => {
    const activeFlockHere = flocks.find(f => f.current_section_id === section.id);
    const lastGraze = grazingHistory?.find(g =>
      (g.section as { id: string } | null)?.id === section.id
    );
    const daysSinceGraze = lastGraze?.end_date ? daysSince(lastGraze.end_date) : null;
    const isActive = !!activeFlockHere;
    const sectionRec = getGrazingRecommendation(section.area_ha, totalAnimals || 1, 0, month);
    const recoveryPct = isActive ? 0
      : daysSinceGraze !== null
      ? Math.min(100, Math.round((daysSinceGraze / sectionRec.restDays) * 100))
      : 100;
    return { ...section, isActive, activeFlockHere, daysSinceGraze, recoveryPct, sectionRec };
  });

  const activeFlocks = flocks.filter(f => f.current_section_id);
  const inactiveFlocks = flocks.filter(f => !f.current_section_id);

  return (
    <div className="space-y-4">

      {/* ── 1. ANBEFALET ROTATIONSPLAN ── */}
      {totalAnimals > 0 && totalHa > 0 && (
        <RotationPlan totalHa={totalHa} totalAnimals={totalAnimals} month={month} />
      )}

      {/* Ingen data endnu */}
      {(totalAnimals === 0 || totalHa === 0) && (
        <div className="card text-center py-6 space-y-2">
          {totalAnimals === 0 && (
            <p className="text-sm text-earth-300">
              <Link href="/animals/flocks" className="text-earth-100 font-medium">Opret flokke med dyr</Link>{" "}
              for at se rotationsanbefalinger
            </p>
          )}
          {totalHa === 0 && (
            <p className="text-sm text-earth-300">
              <Link href="/pastures" className="text-earth-100 font-medium">Tilføj marker og sektioner</Link>{" "}
              for at beregne rotation
            </p>
          )}
        </div>
      )}

      {/* ── 2. AKTUEL STATUS ── */}
      {activeFlocks.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-earth-100 mb-3">Aktuel placering</h3>
          <div className="space-y-3">
            {activeFlocks.map(flock => {
              const grazing = activeByFlock[flock.id];
              const section = grazing?.section as { name: string; area_ha: number } | null;
              const daysGrazing = flock.moved_in_date ? daysSince(flock.moved_in_date) : 0;
              const rec = section
                ? getGrazingRecommendation(section.area_ha, flock.animal_count, daysGrazing, month)
                : null;
              if (!section || !rec) return null;

              return (
                <div key={flock.id} className="rounded-xl p-3 border border-white/10 bg-earth-800/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-earth-50 text-sm">{flock.name}</p>
                      <p className="text-xs text-earth-300 mt-0.5">
                        {section.name} · {flock.animal_count} dyr · {section.area_ha} ha
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-earth-50">{daysGrazing}</p>
                      <p className="text-xs text-earth-300 flex items-center justify-end gap-1">
                        {rec.shouldMove && <AlertTriangle size={11} className="text-clay-400" />}
                        {rec.shouldMove ? "flyt nu" : `/ ${rec.grazeDays} dage`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-earth-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-earth-400"
                        style={{ width: `${Math.min(100, (daysGrazing / rec.grazeDays) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inaktive flokke */}
      {inactiveFlocks.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-earth-300 uppercase tracking-wide mb-2">
            Ikke i rotation
          </p>
          <div className="space-y-1">
            {inactiveFlocks.map(f => (
              <div key={f.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <PawPrint size={16} className="text-earth-300 flex-shrink-0" />
                  <p className="text-sm font-medium text-earth-200">{f.name}</p>
                </div>
                <span className="badge bg-earth-800 text-earth-100">{f.animal_count} dyr</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingen flokke endnu */}
      {flocks.length === 0 && (
        <div className="card border-2 border-dashed border-earth-200 text-center py-6">
          <p className="text-earth-200 text-sm">Ingen flokke er oprettet endnu</p>
        </div>
      )}

      {/* ── Link til planlægger ── */}
      <Link href="/rotation/planner"
        className="card flex items-center justify-between hover:brightness-110 transition-all group">
        <div className="flex items-center gap-3">
          <Ruler size={20} className="text-earth-200 flex-shrink-0" />
          <div>
            <p className="font-semibold text-earth-50 text-sm">Rotationsplanlægger</p>
            <p className="text-xs text-earth-200 mt-0.5">Justér dyr og sektioner interaktivt</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-earth-300 group-hover:text-earth-100 transition-colors flex-shrink-0" />
      </Link>

      {/* ── 3. FLYT FLOK ── */}
      {sections && sections.length > 0 && flocks.length > 0 && (
        <MoveFlockButton
          flocks={flocks}
          sections={sections.map(s => ({
            ...s,
            field: Array.isArray(s.field) ? s.field[0] ?? null : s.field,
          }))}
          farmId={farm.id}
          activeGrazingIds={activeGrazingIds}
        />
      )}

      {/* ── 4. SEKTIONSOVERSIGT ── */}
      <div className="card">
        <h3 className="font-semibold text-earth-100 mb-3">Genopretning</h3>
        {sectionsWithStatus.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-earth-200 text-sm">Ingen sektioner oprettet</p>
            <Link href="/pastures" className="text-sm text-earth-100 font-medium mt-2 inline-block">
              Gå til Marker →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sectionsWithStatus.map(section => (
              <div key={section.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      section.isActive ? "bg-amber-500"
                      : section.recoveryPct >= 80 ? "bg-grass-500"
                      : section.recoveryPct >= 50 ? "bg-yellow-500"
                      : "bg-red-400"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-earth-100">{section.name}</p>
                      <p className="text-xs text-earth-200">{section.area_ha} ha</p>
                    </div>
                    {section.isActive && section.activeFlockHere && (
                      <span className="badge bg-amber-100 text-amber-700 flex-shrink-0 text-xs">
                        {section.activeFlockHere.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-earth-300 ml-2 flex-shrink-0">
                    {section.isActive
                      ? `Dag ${section.activeFlockHere?.moved_in_date ? daysSince(section.activeFlockHere.moved_in_date) : "?"}`
                      : section.daysSinceGraze !== null
                      ? `${section.daysSinceGraze} dages hvile`
                      : "Aldrig græsset"}
                  </p>
                </div>
                <div className="w-full bg-earth-700 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${
                    section.isActive ? "bg-amber-400"
                    : section.recoveryPct >= 80 ? "bg-grass-500"
                    : section.recoveryPct >= 50 ? "bg-yellow-400"
                    : "bg-red-400"
                  }`} style={{ width: `${section.recoveryPct}%` }} />
                </div>
                <p className="text-xs text-earth-200 mt-0.5 text-right">
                  {section.isActive ? "Afgræsses nu" : `${section.recoveryPct}% genoprettet`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rotationsplan-komponent ──────────────────────────────────────────────────

function RotationPlan({ totalHa, totalAnimals, month }: {
  totalHa: number;
  totalAnimals: number;
  month: number;
}) {
  const rec = getOptimalSectionSize(totalHa, totalAnimals, month);

  const sectionDisplay = haOrM2(rec.sectionHa);

  const verdictBorder =
    rec.verdict === "good"  ? "border-grass-600" :
    rec.verdict === "ok"    ? "border-amber-700" :
    rec.verdict === "tight" ? "border-red-800"   :
                              "border-earth-600";

  return (
    <div className="card">
      <h3 className="font-semibold text-earth-50 mb-1">Anbefalet rotation</h3>
      <p className="text-xs text-earth-300 mb-4">
        Baseret på {totalAnimals} dyr og {totalHa.toFixed(2)} ha i alt
      </p>

      {/* Nøgletal */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-earth-300 mb-0.5">Sektionsstørrelse</p>
          <p className="text-3xl font-bold text-earth-50">{sectionDisplay}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-earth-300 mb-0.5">Antal sektioner</p>
          <p className="text-3xl font-bold text-earth-50">{rec.sectionsInLand}</p>
        </div>
      </div>
      <p className="text-xs text-earth-300 mb-4 leading-relaxed">
        {totalAnimals}÷20 dyr/ha = {sectionDisplay} pr. sektion · {totalHa.toFixed(2)} ha giver {Math.floor(totalHa / rec.sectionHa)} sektioner
      </p>

      {/* Hviletid */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-3xl font-bold text-earth-50">{rec.actualRestDays} dage</p>
          <p className="text-sm text-earth-300">af {rec.idealRestDays} anbefalet</p>
        </div>
        <div className="w-full bg-earth-700 rounded-full h-2">
          <div className="h-2 rounded-full bg-earth-400 transition-all"
            style={{ width: `${Math.min(100, (rec.actualRestDays / rec.idealRestDays) * 100)}%` }} />
        </div>
        <p className="text-xs text-earth-300 mt-1">
          ({rec.sectionsInLand}–1)×{rec.grazeDays} dage = {rec.actualRestDays} dages hvile pr. sektion
        </p>
      </div>

      {/* Overskud */}
      {rec.surplusHa > 0.05 && (
        <p className="text-xs text-earth-300 mb-3 flex items-start gap-1.5">
          <Lightbulb size={14} className="flex-shrink-0 mt-0.5" />
          <span>{rec.sectionsIdeal} sektioner à {sectionDisplay} bruger {(rec.sectionsIdeal * rec.sectionHa).toFixed(2)} ha aktivt — de resterende <strong className="text-earth-100">{rec.surplusHa} ha</strong> kan hvile eller høstes.</span>
        </p>
      )}

      {/* Konklusion — venstrekant som eneste farvesignal */}
      <div className={`border-l-2 ${verdictBorder} pl-3 text-sm text-earth-200 space-y-3`}>
        {rec.verdict === "good" && (
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p>Godt forhold mellem flok og areal. Du opnår {rec.actualRestDays} dages hvile — tæt på idealet for {monthName(month)}.</p>
          </div>
        )}
        {rec.verdict === "ok" && (
          <>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p>
                Hvileperioden er {rec.actualRestDays} dage — lidt kortere end de anbefalede {rec.idealRestDays}.
                Rotationen fungerer, men græsset får ikke helt den restitutionstid der er optimal.
                Den bedste langsigtede løsning er at øge flokstørrelsen, så tætheden stiger og hver sektion
                udnyttes hurtigere.
              </p>
            </div>
            {rec.altSectionHa !== null && rec.altDensity !== null && rec.altFeasible && (
              <div className="border-t border-white/10 pt-3">
                <p className="font-medium mb-1">Alternativ med dit nuværende areal:</p>
                <p>
                  Hvis du indhegner i sektioner på {haOrM2(rec.altSectionHa)} i stedet for {sectionDisplay},
                  kan du lave {rec.sectionsIdeal} sektioner og opnå {rec.idealRestDays} dages hvile.
                  Tætheden bliver så {rec.altDensity} dyr/ha — højere end normalt, men stadig inden for
                  hvad mob-græsning tåler. Det kræver mere fleksibel indhegning.
                </p>
              </div>
            )}
          </>
        )}
        {rec.verdict === "tight" && (
          <>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p>
                Arealet er presset i forhold til flokstørrelsen.
                Med sektioner på {sectionDisplay} (20 dyr/ha) og {rec.sectionsInLand} sektioner
                hviler hvert stykke kun {rec.actualRestDays} dage — idealet er {rec.idealRestDays}.
                Den bedste løsning er mere jord eller en større flok så tætheden tillader kortere
                græsningstid pr. sektion.
              </p>
            </div>
            {rec.altSectionHa !== null && rec.altDensity !== null && (
              <div className="border-t border-white/10 pt-3">
                {rec.altFeasible ? (
                  <>
                    <p className="font-medium mb-1">Nødløsning med dit nuværende areal:</p>
                    <p>
                      Du kan indhegne i langt mindre sektioner — {haOrM2(rec.altSectionHa)} —
                      og dermed lave {rec.sectionsIdeal} sektioner inden for dit areal.
                      Det giver {rec.idealRestDays} dages hvile, men tætheden bliver {rec.altDensity} dyr/ha,
                      som er intensiv mob-græsning. Det virker, men kræver hyppig flytning og god indhegning.
                    </p>
                  </>
                ) : (
                  <p>
                    Selv med meget små sektioner kan du ikke opnå {rec.idealRestDays} dages hvile
                    uden at tætheden bliver urealistisk høj. Den reelle løsning er mere jord eller
                    en større flok.
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {rec.verdict === "toofew" && (
          <p>
            Din flok er endnu for lille til optimal mob-græsning — det anbefales at have mindst
            8–10 dyr for at opnå den trample- og afgræsningseffekt der kendetegner holistic management.
            Rotér gerne alligevel; det skader ikke og du opbygger gode vaner.
          </p>
        )}
      </div>
    </div>
  );
}

function monthName(month: number): string {
  const names = ["", "januar", "februar", "marts", "april", "maj", "juni",
                 "juli", "august", "september", "oktober", "november", "december"];
  return names[month] ?? "";
}

function haOrM2(ha: number): string {
  return ha < 0.1
    ? `${Math.round(ha * 10000)} m²`
    : `${ha} ha`;
}
