import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TrendingDown, TrendingUp, Euro, Wheat, PawPrint, FileText, Building2, Clock3, BarChart3, Wallet } from "lucide-react";
import PlantingHarvestRow, { type PlantingRowData, type HarvestLogEntry } from "./PlantingHarvestRow";
import AnimalProductForm, { type FlockOption, type AnimalOption, type AnimalLog } from "./AnimalProductForm";
import ExpenseForm from "./ExpenseForm";
import ExpenseListRow from "./ExpenseListRow";
import BulkExpenseForm from "./BulkExpenseForm";
import { TASK_TYPE_LABELS } from "@/lib/taskTimeEstimates";

const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];
function fmtDate(d: string) {
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

const TABS = [
  { key: "planter",   label: "Planteprodukter", Icon: Wheat     },
  { key: "dyr",       label: "Dyr & produkter", Icon: PawPrint  },
  { key: "udgifter",  label: "Udgifter",        Icon: FileText  },
  { key: "arbejdstid",label: "Arbejdstid",      Icon: Clock3    },
  { key: "rentabilitet", label: "Rentabilitet", Icon: BarChart3 },
];

export default async function OkonomiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; planting?: string; dept?: string }>;
}) {
  const { tab = "planter", planting: preOpenId, dept: deptFilter = "" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id, default_hourly_rate_dkk").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;

  const [
    { data: expenses },
    { data: harvestLogs },
    { data: animalLogs },
    { data: activePlantings },
    { data: flockRows },
    { data: animalRows },
    { data: departments },
    { data: allPlantingsForDept },
    { data: deptSpeciesLinks },
    { data: farmTasks },
    { data: projects },
  ] = await Promise.all([
    supabase
      .from("farm_expenses")
      .select("id, date, category, description, amount_dkk, flock_id, department_id, project_id, hours")
      .eq("farm_id", farm.id)
      .gte("date", yearStart)
      .order("date", { ascending: false }),
    supabase
      .from("harvest_logs")
      .select("id, planting_id, bed_id, harvest_date, quantity_kg, quantity_unit, price_per_kg, sold_to, customer_type, vat_included, notes")
      .eq("farm_id", farm.id)
      .gte("harvest_date", yearStart)
      .order("harvest_date", { ascending: false }),
    supabase
      .from("animal_product_logs")
      .select("id, log_date, product_type, animal_species, flock_id, quantity, unit, sold_to_type, sold_to_name, price_per_unit, vat_included, notes")
      .eq("farm_id", farm.id)
      .gte("log_date", yearStart)
      .order("log_date", { ascending: false }),
    supabase
      .from("bed_plantings")
      .select("id, crop_name, variety, expected_harvest_at, bed_id, beds(name)")
      .eq("farm_id", farm.id)
      .not("status", "in", "(fjernet,høstet)")
      .order("expected_harvest_at", { nullsFirst: false }),
    // Flokke med dyreantal
    supabase
      .from("flocks")
      .select("id, name, department_id")
      .eq("farm_id", farm.id)
      .order("name"),
    // Aktive dyr
    supabase
      .from("animals")
      .select("id, ear_tag, name, flock_id, species")
      .eq("farm_id", farm.id)
      .eq("status", "active")
      .order("ear_tag"),
    // Afdelinger
    supabase.from("departments").select("id, name").eq("farm_id", farm.id).order("name"),
    // Alle plantninger (også historiske) — til at kunne afdelings-mærke høstlogs og til rentabilitet pr. sort
    supabase.from("bed_plantings").select("id, crop_name, variety, crop_varieties(species_id)").eq("farm_id", farm.id),
    supabase.from("department_species_links").select("species_id, department_id").eq("farm_id", farm.id),
    // Arbejdstid: udførte opgaver med faktisk logget tid i år
    supabase
      .from("farm_tasks")
      .select("id, title, task_type, estimated_minutes, actual_minutes, done_at, flock_id, bed_planting_id")
      .eq("farm_id", farm.id)
      .eq("status", "done")
      .not("actual_minutes", "is", null)
      .gte("done_at", yearStart),
    // Aktive projekter — til at kunne knytte en udgift til et projekts forbrug
    supabase
      .from("budget_projects")
      .select("id, name")
      .eq("farm_id", farm.id)
      .in("status", ["planlagt", "i gang"])
      .order("name"),
  ]);

  // ── Afdelings-opslag ──────────────────────────────────────────────────
  const flockDept: Record<string, string> = {};
  for (const f of flockRows ?? []) if (f.department_id) flockDept[f.id] = f.department_id;

  const speciesDept: Record<string, string> = {};
  for (const l of deptSpeciesLinks ?? []) speciesDept[l.species_id] = l.department_id;

  const plantingDept: Record<string, string> = {};
  for (const p of allPlantingsForDept ?? []) {
    const speciesId = (p.crop_varieties as unknown as { species_id: string } | null)?.species_id;
    if (speciesId && speciesDept[speciesId]) plantingDept[p.id] = speciesDept[speciesId];
  }

  const deptNameById: Record<string, string> = {};
  for (const d of departments ?? []) deptNameById[d.id] = d.name;

  function deptForExpense(e: { department_id: string | null; flock_id: string | null }) {
    return e.department_id ?? (e.flock_id ? flockDept[e.flock_id] ?? null : null);
  }
  function deptForFlockId(flockId: string | null) {
    return flockId ? flockDept[flockId] ?? null : null;
  }
  function deptForPlantingId(plantingId: string | null) {
    return plantingId ? plantingDept[plantingId] ?? null : null;
  }

  // ── Afdelingsfilter ────────────────────────────────────────────────────
  const filteredExpenses = deptFilter
    ? (expenses ?? []).filter(e => deptForExpense(e) === deptFilter)
    : (expenses ?? []);
  const filteredAnimalLogs = deptFilter
    ? (animalLogs ?? []).filter(l => deptForFlockId(l.flock_id) === deptFilter)
    : (animalLogs ?? []);
  const filteredHarvestLogs = deptFilter
    ? (harvestLogs ?? []).filter(l => deptForPlantingId(l.planting_id) === deptFilter)
    : (harvestLogs ?? []);

  // Flokke med dyreantal
  const animalCountByFlock = (animalRows ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
    return acc;
  }, {});

  const flocks: FlockOption[] = (flockRows ?? []).map(f => ({
    id: f.id,
    name: f.name,
    animalCount: animalCountByFlock[f.id] ?? 0,
  }));

  const animals: AnimalOption[] = (animalRows ?? []) as AnimalOption[];

  // Planting-rows (respekterer afdelingsfilter)
  const logsByPlanting = new Map<string, HarvestLogEntry[]>();
  for (const log of filteredHarvestLogs) {
    if (!log.planting_id) continue;
    const list = logsByPlanting.get(log.planting_id) ?? [];
    list.push(log as HarvestLogEntry);
    logsByPlanting.set(log.planting_id, list);
  }
  const visiblePlantings = deptFilter
    ? (activePlantings ?? []).filter(p => deptForPlantingId(p.id) === deptFilter)
    : (activePlantings ?? []);
  const plantingRows: PlantingRowData[] = visiblePlantings.map(p => {
    const bedName = (p.beds as unknown as { name: string } | null)?.name;
    return {
      id:                p.id,
      cropLabel:         `${p.crop_name}${p.variety ? ` · ${p.variety}` : ""}${bedName ? ` — ${bedName}` : ""}`,
      bedId:             p.bed_id,
      expectedHarvestAt: p.expected_harvest_at,
      logs:              logsByPlanting.get(p.id) ?? [],
    };
  });

  // Økonomi-summer (respekterer afdelingsfilter)
  const harvestRevenue  = filteredHarvestLogs.reduce((s, l) => s + ((l.quantity_kg ?? 0) * (l.price_per_kg ?? 0)), 0);
  const animalRevenue   = filteredAnimalLogs.filter(l => l.sold_to_type !== "ikke_solgt").reduce((s, l) => s + (l.quantity * (l.price_per_unit ?? 0)), 0);
  const totalExpenses   = filteredExpenses.filter(e => e.amount_dkk < 0).reduce((s, e) => s + Math.abs(e.amount_dkk), 0);
  const subsidies       = filteredExpenses.filter(e => e.amount_dkk > 0).reduce((s, e) => s + e.amount_dkk, 0);
  const totalRevenue    = harvestRevenue + animalRevenue + subsidies;
  const netResult       = totalRevenue - totalExpenses;

  // Per-flok P&L (uafhængig af afdelingsfilter — viser altid alle flokke)
  const flockPL = flocks.map(flock => {
    const revenue = (animalLogs ?? [])
      .filter(l => l.flock_id === flock.id && l.sold_to_type !== "ikke_solgt")
      .reduce((s, l) => s + (l.quantity * (l.price_per_unit ?? 0)), 0);
    const costs = (expenses ?? [])
      .filter(e => e.flock_id === flock.id && e.amount_dkk < 0)
      .reduce((s, e) => s + Math.abs(e.amount_dkk), 0);
    return { ...flock, revenue, costs, net: revenue - costs };
  }).filter(f => f.revenue > 0 || f.costs > 0);

  // ── Arbejdstid ─────────────────────────────────────────────────────────
  const hourlyRate = farm.default_hourly_rate_dkk ?? null;
  const filteredTasks = deptFilter
    ? (farmTasks ?? []).filter(t => {
        const d = deptForFlockId(t.flock_id) ?? deptForPlantingId(t.bed_planting_id);
        return d === deptFilter;
      })
    : (farmTasks ?? []);
  const totalMinutesLogged = filteredTasks.reduce((s, t) => s + (t.actual_minutes ?? 0), 0);
  const byTaskType = new Map<string, { minutes: number; count: number }>();
  for (const t of filteredTasks) {
    const key = t.task_type ?? "andet";
    const cur = byTaskType.get(key) ?? { minutes: 0, count: 0 };
    cur.minutes += t.actual_minutes ?? 0;
    cur.count += 1;
    byTaskType.set(key, cur);
  }
  const taskTypeRows = [...byTaskType.entries()].sort((a, b) => b[1].minutes - a[1].minutes);

  // ── Rentabilitet pr. afdeling ────────────────────────────────────────
  const deptRevenue: Record<string, number> = {};
  const deptExpense: Record<string, number> = {};
  const deptMinutes: Record<string, number> = {};
  function addDeptRevenue(d: string | null, amt: number) { if (d) deptRevenue[d] = (deptRevenue[d] ?? 0) + amt; }
  function addDeptExpense(d: string | null, amt: number) { if (d) deptExpense[d] = (deptExpense[d] ?? 0) + amt; }

  for (const l of harvestLogs ?? []) {
    addDeptRevenue(deptForPlantingId(l.planting_id), (l.quantity_kg ?? 0) * (l.price_per_kg ?? 0));
  }
  for (const l of animalLogs ?? []) {
    if (l.sold_to_type === "ikke_solgt") continue;
    addDeptRevenue(deptForFlockId(l.flock_id), l.quantity * (l.price_per_unit ?? 0));
  }
  for (const e of expenses ?? []) {
    const d = deptForExpense(e);
    if (e.amount_dkk < 0) addDeptExpense(d, Math.abs(e.amount_dkk));
    else addDeptRevenue(d, e.amount_dkk);
  }
  for (const t of farmTasks ?? []) {
    const d = deptForFlockId(t.flock_id) ?? deptForPlantingId(t.bed_planting_id);
    if (d) deptMinutes[d] = (deptMinutes[d] ?? 0) + (t.actual_minutes ?? 0);
  }

  const deptRentability = (departments ?? [])
    .map(d => {
      const revenue = deptRevenue[d.id] ?? 0;
      const expense = deptExpense[d.id] ?? 0;
      const minutes = deptMinutes[d.id] ?? 0;
      const net = revenue - expense;
      return { id: d.id, name: d.name, revenue, expense, minutes, net, perHour: minutes > 0 ? net / (minutes / 60) : null };
    })
    .filter(d => d.revenue > 0 || d.expense > 0 || d.minutes > 0);

  // ── Rentabilitet pr. sort ────────────────────────────────────────────
  const plantingLabel: Record<string, string> = {};
  for (const p of allPlantingsForDept ?? []) {
    plantingLabel[p.id] = `${p.crop_name}${p.variety ? ` · ${p.variety}` : ""}`;
  }
  const varietyRevenue: Record<string, number> = {};
  const varietyMinutes: Record<string, number> = {};
  for (const l of harvestLogs ?? []) {
    if (!l.planting_id) continue;
    const label = plantingLabel[l.planting_id];
    if (!label) continue;
    varietyRevenue[label] = (varietyRevenue[label] ?? 0) + (l.quantity_kg ?? 0) * (l.price_per_kg ?? 0);
  }
  for (const t of farmTasks ?? []) {
    if (!t.bed_planting_id) continue;
    const label = plantingLabel[t.bed_planting_id];
    if (!label) continue;
    varietyMinutes[label] = (varietyMinutes[label] ?? 0) + (t.actual_minutes ?? 0);
  }
  const varietyLabels = new Set([...Object.keys(varietyRevenue), ...Object.keys(varietyMinutes)]);
  const varietyRentability = [...varietyLabels]
    .map(label => {
      const revenue = varietyRevenue[label] ?? 0;
      const minutes = varietyMinutes[label] ?? 0;
      return { label, revenue, minutes, perHour: minutes > 0 ? revenue / (minutes / 60) : null };
    })
    .sort((a, b) => (b.perHour ?? b.revenue) - (a.perHour ?? a.revenue));

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-earth-50">Økonomi & Admin</h1>
          <p className="text-sm text-earth-300 mt-0.5">{currentYear}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href="/operations/economy/budget"
            className="flex items-center gap-1.5 text-xs text-earth-300 py-2 px-3 rounded-xl"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Wallet size={13} />
            Budget
          </Link>
          <Link
            href="/operations/economy/departments"
            className="flex items-center gap-1.5 text-xs text-earth-300 py-2 px-3 rounded-xl"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Building2 size={13} />
            Afdelinger
          </Link>
        </div>
      </div>

      {/* Afdelingsfilter */}
      {(departments ?? []).length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Link
            href={`/operations/economy?tab=${tab}`}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: !deptFilter ? "var(--clay, #c4622a)" : "var(--surface)",
              color: !deptFilter ? "#fff" : "var(--text-muted)",
            }}
          >
            Hele gården
          </Link>
          {(departments ?? []).map(d => (
            <Link
              key={d.id}
              href={`/operations/economy?tab=${tab}&dept=${d.id}`}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: deptFilter === d.id ? "var(--clay, #c4622a)" : "var(--surface)",
                color: deptFilter === d.id ? "#fff" : "var(--text-muted)",
              }}
            >
              {d.name}
            </Link>
          ))}
        </div>
      )}

      {/* Årsresultat */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label:"Udgifter", value:totalExpenses, icon:<TrendingDown size={13}/>, color:"#f87171", bg:"rgba(239,68,68,0.08)" },
          { label:"Indtægt",  value:totalRevenue,  icon:<TrendingUp  size={13}/>, color:"#a3e635", bg:"rgba(163,230,53,0.08)" },
          { label:"Resultat", value:netResult, icon:<Euro size={13}/>,
            color: netResult >= 0 ? "#a3e635" : "#f87171",
            bg:    netResult >= 0 ? "rgba(163,230,53,0.08)" : "rgba(239,68,68,0.08)" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
            <div className="flex items-center justify-center gap-0.5 mb-1" style={{ color }}>
              {icon}
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-bold leading-tight" style={{ color }}>
              {label === "Resultat" && value > 0 ? "+" : ""}
              {Math.round(value).toLocaleString("da-DK")} kr
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
        {TABS.map(({ key, label, Icon }) => (
          <Link key={key} href={`/operations/economy?tab=${key}${deptFilter ? `&dept=${deptFilter}` : ""}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: tab === key ? "var(--surface-raised)" : "transparent",
              color:      tab === key ? "var(--text-primary, #f5f0e8)" : "var(--text-muted)",
            }}>
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </Link>
        ))}
      </div>

      {/* ── Planteprodukter ── */}
      {tab === "planter" && (
        <div className="space-y-3">
          {plantingRows.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
              <p className="text-xs text-earth-500">Ingen aktive plantinger at høste fra</p>
              <Link href="/farming/beds" className="text-xs text-earth-400 underline mt-1 block">Gå til bede →</Link>
            </div>
          ) : (
            plantingRows.map(row => (
              <PlantingHarvestRow key={row.id} planting={row} farmId={farm.id} defaultOpen={row.id === preOpenId} />
            ))
          )}
          {plantingRows.some(r => r.logs.length > 0) && (
            <p className="text-[10px] text-earth-600 px-1">Klik ↓ ved en afgrøde for at se tidligere registreringer</p>
          )}
        </div>
      )}

      {/* ── Dyr & produkter ── */}
      {tab === "dyr" && (
        <div className="space-y-4">
          {/* Per-flok P&L */}
          {flockPL.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="px-4 pt-3 pb-2 text-[10px] font-semibold text-earth-500 uppercase tracking-widest">
                Flok-økonomi {currentYear}
              </p>
              <div className="divide-y divide-white/5">
                {flockPL.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-earth-100">{f.name}</p>
                      <div className="flex gap-3 mt-0.5 text-[11px] text-earth-500">
                        {f.revenue > 0 && <span style={{ color: "#a3e635" }}>+{Math.round(f.revenue).toLocaleString("da-DK")} kr</span>}
                        {f.costs > 0 && <span style={{ color: "#f87171" }}>−{Math.round(f.costs).toLocaleString("da-DK")} kr</span>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0"
                      style={{ color: f.net >= 0 ? "#a3e635" : "#f87171" }}>
                      {f.net >= 0 ? "+" : ""}{Math.round(f.net).toLocaleString("da-DK")} kr
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AnimalProductForm
            farmId={farm.id}
            recentLogs={filteredAnimalLogs as AnimalLog[]}
            flocks={flocks}
            animals={animals}
          />
        </div>
      )}

      {/* ── Udgifter ── */}
      {tab === "udgifter" && (
        <div className="space-y-3">
          <ExpenseForm farmId={farm.id} flocks={flocks} departments={departments ?? []} projects={projects ?? []} />
          <BulkExpenseForm farmId={farm.id} flocks={flocks} departments={departments ?? []} />

          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">
              Udgifter & tilskud {currentYear}
            </p>
            {filteredExpenses.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-earth-500">Ingen udgifter registreret endnu</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredExpenses.map(e => (
                  <ExpenseListRow
                    key={e.id}
                    expense={e}
                    farmId={farm.id}
                    flocks={flocks}
                    departments={departments ?? []}
                    projects={projects ?? []}
                    departmentName={(() => { const d = deptForExpense(e); return d ? deptNameById[d] ?? null : null; })()}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Arbejdstid ── */}
      {tab === "arbejdstid" && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] font-semibold text-earth-500 uppercase tracking-widest mb-2">
              Logget arbejdstid {currentYear}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-earth-50">
                {Math.round(totalMinutesLogged / 60 * 10) / 10}t
              </p>
              <p className="text-xs text-earth-400">({totalMinutesLogged} min)</p>
            </div>
            {hourlyRate ? (
              <p className="text-sm mt-1" style={{ color: "#a3e635" }}>
                ≈ {Math.round(totalMinutesLogged / 60 * hourlyRate).toLocaleString("da-DK")} kr til {hourlyRate} kr/time
              </p>
            ) : (
              <p className="text-xs text-earth-500 mt-1">
                Sæt en timesats i <Link href="/settings" className="underline">Indstillinger</Link> for at se det som kroner.
              </p>
            )}
          </div>

          {taskTypeRows.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
              <p className="text-xs text-earth-500">Ingen tidsregistreringer endnu i år</p>
              <p className="text-[11px] text-earth-600 mt-1">Logges når du afkrydser en opgave med opgavetype i kalenderen eller på et bed</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">
                Fordelt pr. opgavetype
              </p>
              <div className="divide-y divide-white/5">
                {taskTypeRows.map(([type, { minutes, count }]) => (
                  <div key={type} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-earth-100">{TASK_TYPE_LABELS[type as keyof typeof TASK_TYPE_LABELS] ?? type}</p>
                      <p className="text-[11px] text-earth-500 mt-0.5">{count} {count === 1 ? "opgave" : "opgaver"}</p>
                    </div>
                    <span className="text-xs font-semibold text-earth-200 flex-shrink-0">
                      {Math.round(minutes / 60 * 10) / 10}t
                      {hourlyRate && <span className="text-earth-500"> · {Math.round(minutes / 60 * hourlyRate).toLocaleString("da-DK")} kr</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Rentabilitet ── */}
      {tab === "rentabilitet" && (
        <div className="space-y-4">
          <p className="text-[11px] text-earth-500 px-1">
            Bygget på det du allerede har registreret — indtægt fra høst/dyreprodukter/tilskud, udgift fra Udgifter-fanen, og tid fra tidsregistreringen. Ingen skøn eller fordelte fællesudgifter.
          </p>

          {/* Pr. afdeling */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">
              Pr. afdeling {currentYear}
            </p>
            {deptRentability.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-earth-500">Ingen data endnu — tildel flokke/afgrøder til afdelinger under <Link href="/operations/economy/departments" className="underline">Afdelinger</Link></p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {deptRentability.map(d => (
                  <div key={d.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-earth-100">{d.name}</p>
                      <span className="text-sm font-semibold" style={{ color: d.net >= 0 ? "#a3e635" : "#f87171" }}>
                        {d.net >= 0 ? "+" : ""}{Math.round(d.net).toLocaleString("da-DK")} kr
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-earth-500">
                      {d.revenue > 0 && <span style={{ color: "#a3e635" }}>+{Math.round(d.revenue).toLocaleString("da-DK")} kr</span>}
                      {d.expense > 0 && <span style={{ color: "#f87171" }}>−{Math.round(d.expense).toLocaleString("da-DK")} kr</span>}
                      {d.minutes > 0 && <span>{Math.round(d.minutes / 60 * 10) / 10}t logget</span>}
                      {d.perHour !== null && <span>{Math.round(d.perHour).toLocaleString("da-DK")} kr/time</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pr. sort */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">
              Pr. sort {currentYear}
            </p>
            {varietyRentability.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-earth-500">Ingen høst eller tidsregistrering endnu i år</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {varietyRentability.map(v => (
                  <div key={v.label} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-earth-100 truncate">{v.label}</p>
                      <p className="text-[11px] text-earth-500 mt-0.5">
                        {v.revenue > 0 ? `${Math.round(v.revenue).toLocaleString("da-DK")} kr` : "Ingen indtægt"}
                        {v.minutes > 0 && <span> · {Math.round(v.minutes / 60 * 10) / 10}t</span>}
                      </p>
                    </div>
                    {v.perHour !== null ? (
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: v.perHour >= 0 ? "#a3e635" : "#f87171" }}>
                        {Math.round(v.perHour).toLocaleString("da-DK")} kr/time
                      </span>
                    ) : (
                      <span className="text-[11px] text-earth-600 flex-shrink-0">Ingen tid logget</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
