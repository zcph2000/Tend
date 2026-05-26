import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TrendingDown, TrendingUp, Euro, Wheat, PawPrint, FileText } from "lucide-react";
import PlantingHarvestRow, { type PlantingRowData, type HarvestLogEntry } from "./PlantingHarvestRow";
import AnimalProductForm from "./AnimalProductForm";

const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];
function fmtDate(d: string) {
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  frø: "Frø", gødning: "Gødning", planteværn: "Planteværn",
  redskaber: "Redskaber", maskiner: "Maskiner", foder: "Foder",
  veterinær: "Veterinær", forpagning: "Forpagning", tilskud: "Tilskud",
  løn: "Løn", andet: "Andet",
};

const TABS = [
  { key: "planter",  label: "Planteprodukter", Icon: Wheat },
  { key: "dyr",      label: "Dyr & produkter", Icon: PawPrint },
  { key: "udgifter", label: "Udgifter",         Icon: FileText },
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
  ] = await Promise.all([
    supabase
      .from("farm_expenses")
      .select("id, date, category, description, amount_dkk")
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
      .select("id, log_date, product_type, animal_species, quantity, unit, sold_to_type, sold_to_name, price_per_unit, vat_included, notes")
      .eq("farm_id", farm.id)
      .gte("log_date", yearStart)
      .order("log_date", { ascending: false }),
    supabase
      .from("bed_plantings")
      .select("id, crop_name, variety, expected_harvest_at, bed_id, beds(name)")
      .eq("farm_id", farm.id)
      .not("status", "in", "(fjernet,høstet)")
      .order("expected_harvest_at", { nullsFirst: false }),
  ]);

  // Grupér harvest logs pr. planting
  const logsByPlanting = new Map<string, HarvestLogEntry[]>();
  for (const log of harvestLogs ?? []) {
    const list = logsByPlanting.get(log.planting_id ?? "") ?? [];
    list.push(log as HarvestLogEntry);
    if (log.planting_id) logsByPlanting.set(log.planting_id, list);
  }

  // Byg planting-rows til komponenten
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
  const harvestRevenue = (harvestLogs ?? [])
    .reduce((s, l) => s + ((l.quantity_kg ?? 0) * (l.price_per_kg ?? 0)), 0);
  const animalRevenue = (animalLogs ?? [])
    .filter(l => l.sold_to_type !== "ikke_solgt")
    .reduce((s, l) => s + (l.quantity * (l.price_per_unit ?? 0)), 0);
  const totalExpenses = (expenses ?? [])
    .filter(e => e.amount_dkk < 0)
    .reduce((s, e) => s + Math.abs(e.amount_dkk), 0);
  const subsidies = (expenses ?? [])
    .filter(e => e.amount_dkk > 0)
    .reduce((s, e) => s + e.amount_dkk, 0);
  const totalRevenue = harvestRevenue + animalRevenue + subsidies;
  const netResult = totalRevenue - totalExpenses;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Økonomi & Admin</h1>
        <p className="text-sm text-earth-300 mt-0.5">{currentYear}</p>
      </div>

      {/* Årsresultat */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Udgifter", value: totalExpenses, icon: <TrendingDown size={13} />, color: "#f87171", bg: "rgba(239,68,68,0.08)" },
          { label: "Indtægt",  value: totalRevenue,  icon: <TrendingUp  size={13} />, color: "#a3e635", bg: "rgba(163,230,53,0.08)" },
          {
            label: "Resultat",
            value: netResult,
            icon: <Euro size={13} />,
            color: netResult >= 0 ? "#a3e635" : "#f87171",
            bg:    netResult >= 0 ? "rgba(163,230,53,0.08)" : "rgba(239,68,68,0.08)",
          },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
            <div className="flex items-center justify-center gap-0.5 mb-1" style={{ color }}>
              {icon}
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-bold leading-tight" style={{ color }}>
              {value !== 0 && netResult === value && value > 0 ? "+" : ""}
              {Math.round(value).toLocaleString("da-DK")} kr
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
        {TABS.map(({ key, label, Icon }) => (
          <Link
            key={key}
            href={`/drift/okonomi?tab=${key}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: tab === key ? "var(--surface-raised)" : "transparent",
              color:      tab === key ? "var(--text-primary, #f5f0e8)" : "var(--text-muted)",
            }}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </Link>
        ))}
      </div>

      {/* ── Tab: Planteprodukter ── */}
      {tab === "planter" && (
        <div className="space-y-3">
          {plantingRows.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
              <p className="text-xs text-earth-500">Ingen aktive plantinger at høste fra</p>
              <Link href="/jordbrug/bede" className="text-xs text-earth-400 underline mt-1 block">
                Gå til bede →
              </Link>
            </div>
          ) : (
            plantingRows.map(row => (
              <PlantingHarvestRow
                key={row.id}
                planting={row}
                farmId={farm.id}
                defaultOpen={row.id === preOpenId}
              />
            ))
          )}

          {/* Allerede høstede afgrøder med logs */}
          {(harvestLogs ?? []).length > 0 && plantingRows.every(r => r.logs.length === 0) === false && (
            <p className="text-[10px] text-earth-600 px-1 pt-1">
              Klik på ↓ ved en afgrøde for at se tidligere registreringer
            </p>
          )}
        </div>
      )}

      {/* ── Tab: Dyr & produkter ── */}
      {tab === "dyr" && (
        <AnimalProductForm
          farmId={farm.id}
          recentLogs={(animalLogs ?? []) as Parameters<typeof AnimalProductForm>[0]["recentLogs"]}
        />
      )}

      {/* ── Tab: Udgifter ── */}
      {tab === "udgifter" && (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h2 className="font-semibold text-earth-100 text-sm">Udgifter & tilskud {currentYear}</h2>
              <span className="text-[10px] text-earth-600">Tilføj-funktion kommer</span>
            </div>
            {(expenses ?? []).length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-earth-500">Ingen udgifter registreret</p>
                <p className="text-[11px] text-earth-600 mt-1">Frø, gødning, tilskud — alt samles her</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {expenses!.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-[11px] text-earth-500 w-16 flex-shrink-0 pt-0.5">{fmtDate(e.date)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-earth-100">{e.description ?? CATEGORY_LABEL[e.category] ?? e.category}</p>
                      <p className="text-[11px] text-earth-500 mt-0.5">{CATEGORY_LABEL[e.category]}</p>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0"
                      style={{ color: e.amount_dkk >= 0 ? "#a3e635" : "#f87171" }}>
                      {e.amount_dkk >= 0 ? "+" : ""}{Math.round(e.amount_dkk).toLocaleString("da-DK")} kr
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 opacity-40">
            {["EU-tilskud & ansøgninger", "Budgetplan"].map(label => (
              <div key={label} className="rounded-xl px-4 py-3"
                style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-sm font-semibold text-earth-200">{label}</p>
                <span className="text-[10px] text-earth-600">Kommer snart</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
