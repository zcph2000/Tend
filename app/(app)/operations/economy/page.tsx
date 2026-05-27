import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TrendingDown, TrendingUp, Euro, Wheat, PawPrint, FileText } from "lucide-react";
import PlantingHarvestRow, { type PlantingRowData, type HarvestLogEntry } from "./PlantingHarvestRow";
import AnimalProductForm, { type FlockOption, type AnimalOption, type AnimalLog } from "./AnimalProductForm";
import ExpenseForm from "./ExpenseForm";

const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];
function fmtDate(d: string) {
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  frø:"Frø", gødning:"Gødning", planteværn:"Planteværn", redskaber:"Redskaber",
  maskiner:"Maskiner", foder:"Foder", veterinær:"Veterinær",
  forpagning:"Forpagning", tilskud:"Tilskud", løn:"Løn", andet:"Andet",
};

const TABS = [
  { key: "planter",  label: "Planteprodukter", Icon: Wheat     },
  { key: "dyr",      label: "Dyr & produkter", Icon: PawPrint  },
  { key: "udgifter", label: "Udgifter",         Icon: FileText  },
];

export default async function OkonomiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; planting?: string }>;
}) {
  const { tab = "planter", planting: preOpenId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

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
  ] = await Promise.all([
    supabase
      .from("farm_expenses")
      .select("id, date, category, description, amount_dkk, flock_id")
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
      .select("id, name")
      .eq("farm_id", farm.id)
      .order("name"),
    // Aktive dyr
    supabase
      .from("animals")
      .select("id, ear_tag, name, flock_id, species")
      .eq("farm_id", farm.id)
      .eq("status", "active")
      .order("ear_tag"),
  ]);

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

  // Planting-rows
  const logsByPlanting = new Map<string, HarvestLogEntry[]>();
  for (const log of harvestLogs ?? []) {
    if (!log.planting_id) continue;
    const list = logsByPlanting.get(log.planting_id) ?? [];
    list.push(log as HarvestLogEntry);
    logsByPlanting.set(log.planting_id, list);
  }
  const plantingRows: PlantingRowData[] = (activePlantings ?? []).map(p => {
    const bedName = (p.beds as unknown as { name: string } | null)?.name;
    return {
      id:                p.id,
      cropLabel:         `${p.crop_name}${p.variety ? ` · ${p.variety}` : ""}${bedName ? ` — ${bedName}` : ""}`,
      bedId:             p.bed_id,
      expectedHarvestAt: p.expected_harvest_at,
      logs:              logsByPlanting.get(p.id) ?? [],
    };
  });

  // Økonomi-summer
  const harvestRevenue  = (harvestLogs ?? []).reduce((s, l) => s + ((l.quantity_kg ?? 0) * (l.price_per_kg ?? 0)), 0);
  const animalRevenue   = (animalLogs ?? []).filter(l => l.sold_to_type !== "ikke_solgt").reduce((s, l) => s + (l.quantity * (l.price_per_unit ?? 0)), 0);
  const totalExpenses   = (expenses ?? []).filter(e => e.amount_dkk < 0).reduce((s, e) => s + Math.abs(e.amount_dkk), 0);
  const subsidies       = (expenses ?? []).filter(e => e.amount_dkk > 0).reduce((s, e) => s + e.amount_dkk, 0);
  const totalRevenue    = harvestRevenue + animalRevenue + subsidies;
  const netResult       = totalRevenue - totalExpenses;

  // Per-flok P&L
  const flockPL = flocks.map(flock => {
    const revenue = (animalLogs ?? [])
      .filter(l => l.flock_id === flock.id && l.sold_to_type !== "ikke_solgt")
      .reduce((s, l) => s + (l.quantity * (l.price_per_unit ?? 0)), 0);
    const costs = (expenses ?? [])
      .filter(e => (e as any).flock_id === flock.id && e.amount_dkk < 0)
      .reduce((s, e) => s + Math.abs(e.amount_dkk), 0);
    return { ...flock, revenue, costs, net: revenue - costs };
  }).filter(f => f.revenue > 0 || f.costs > 0);

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Økonomi & Admin</h1>
        <p className="text-sm text-earth-300 mt-0.5">{currentYear}</p>
      </div>

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
          <Link key={key} href={`/operations/economy?tab=${key}`}
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
            recentLogs={(animalLogs ?? []) as AnimalLog[]}
            flocks={flocks}
            animals={animals}
          />
        </div>
      )}

      {/* ── Udgifter ── */}
      {tab === "udgifter" && (
        <div className="space-y-3">
          <ExpenseForm farmId={farm.id} flocks={flocks} />

          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">
              Udgifter & tilskud {currentYear}
            </p>
            {(expenses ?? []).length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-earth-500">Ingen udgifter registreret endnu</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {expenses!.map(e => {
                  const flockName = flocks.find(f => f.id === (e as any).flock_id)?.name;
                  return (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-[11px] text-earth-500 w-16 flex-shrink-0 pt-0.5">{fmtDate(e.date)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-earth-100">{e.description ?? CATEGORY_LABEL[e.category] ?? e.category}</p>
                        <p className="text-[11px] text-earth-500 mt-0.5">
                          {CATEGORY_LABEL[e.category]}
                          {flockName && <span> · {flockName}</span>}
                        </p>
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0"
                        style={{ color: e.amount_dkk >= 0 ? "#a3e635" : "#f87171" }}>
                        {e.amount_dkk >= 0 ? "+" : ""}{Math.round(e.amount_dkk).toLocaleString("da-DK")} kr
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
