import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Euro, TrendingDown, TrendingUp, Wheat, FileText, ChevronRight, Plus,
} from "lucide-react";

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

export default async function OkonomiPage() {
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

  const [{ data: expenses }, { data: harvests }] = await Promise.all([
    supabase
      .from("farm_expenses")
      .select("id, date, category, description, amount_dkk")
      .eq("farm_id", farm.id)
      .gte("date", yearStart)
      .order("date", { ascending: false }),
    supabase
      .from("harvest_logs")
      .select("id, harvest_date, planting_id, quantity_kg, sold_to, price_per_kg, notes, bed_plantings(crop_name, variety)")
      .eq("farm_id", farm.id)
      .gte("harvest_date", yearStart)
      .order("harvest_date", { ascending: false }),
  ]);

  const totalExpenses = (expenses ?? [])
    .filter(e => e.amount_dkk < 0)
    .reduce((sum, e) => sum + Math.abs(e.amount_dkk), 0);

  const totalIncome = (expenses ?? [])
    .filter(e => e.amount_dkk > 0)
    .reduce((sum, e) => sum + e.amount_dkk, 0);

  const totalHarvestKg = (harvests ?? [])
    .reduce((sum, h) => sum + (h.quantity_kg ?? 0), 0);

  const totalHarvestRevenue = (harvests ?? [])
    .reduce((sum, h) => sum + ((h.quantity_kg ?? 0) * (h.price_per_kg ?? 0)), 0);

  const netResult = totalIncome + totalHarvestRevenue - totalExpenses;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Økonomi & Admin</h1>
        <p className="text-sm text-earth-300 mt-0.5">{currentYear} · oversigt</p>
      </div>

      {/* Årsresultat */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Udgifter",
            value: `${totalExpenses.toLocaleString("da-DK")} kr`,
            icon: <TrendingDown size={14} />,
            color: "#f87171",
            bg: "rgba(239,68,68,0.08)",
          },
          {
            label: "Indtægt",
            value: `${(totalIncome + totalHarvestRevenue).toLocaleString("da-DK")} kr`,
            icon: <TrendingUp size={14} />,
            color: "#a3e635",
            bg: "rgba(163,230,53,0.08)",
          },
          {
            label: "Resultat",
            value: `${netResult >= 0 ? "+" : ""}${Math.round(netResult).toLocaleString("da-DK")} kr`,
            icon: <Euro size={14} />,
            color: netResult >= 0 ? "#a3e635" : "#f87171",
            bg: netResult >= 0 ? "rgba(163,230,53,0.08)" : "rgba(239,68,68,0.08)",
          },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
            <div className="flex items-center justify-center gap-1 mb-1" style={{ color }}>
              {icon}
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Høstlog */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Wheat size={15} className="text-earth-400" />
            <h2 className="font-semibold text-earth-100 text-sm">Høstlog</h2>
            {totalHarvestKg > 0 && (
              <span className="text-[10px] text-earth-500">· {totalHarvestKg.toFixed(1)} kg i alt</span>
            )}
          </div>
          <Link href="/jordbrug/bede" className="text-[11px] text-earth-500 hover:text-earth-300 transition-colors flex items-center gap-0.5">
            Registrér <ChevronRight size={11} />
          </Link>
        </div>

        {(harvests ?? []).length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-earth-500">Ingen høster registreret endnu</p>
            <p className="text-[11px] text-earth-600 mt-1">Registrér høst direkte fra et bed</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {harvests!.map((h) => {
              const planting = h.bed_plantings as unknown as { crop_name: string; variety: string | null } | null;
              const revenue = (h.quantity_kg ?? 0) * (h.price_per_kg ?? 0);
              return (
                <div key={h.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-[11px] text-earth-500 w-16 flex-shrink-0 pt-0.5">{fmtDate(h.harvest_date)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-earth-100">
                      {planting?.crop_name ?? "Ukendt"}{planting?.variety ? ` · ${planting.variety}` : ""}
                    </p>
                    <div className="flex gap-2 mt-0.5 text-[11px] text-earth-500">
                      {h.quantity_kg && <span>{h.quantity_kg} kg</span>}
                      {h.sold_to && <span>· {h.sold_to}</span>}
                      {h.notes && <span>· {h.notes}</span>}
                    </div>
                  </div>
                  {revenue > 0 && (
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#a3e635" }}>
                      {Math.round(revenue).toLocaleString("da-DK")} kr
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Udgifter */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-earth-400" />
            <h2 className="font-semibold text-earth-100 text-sm">Udgifter & tilskud</h2>
          </div>
          <button disabled className="text-[11px] text-earth-600 flex items-center gap-0.5 cursor-default">
            <Plus size={11} /> Tilføj (snart)
          </button>
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
                <span
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: e.amount_dkk >= 0 ? "#a3e635" : "#f87171" }}
                >
                  {e.amount_dkk >= 0 ? "+" : ""}{Math.round(e.amount_dkk).toLocaleString("da-DK")} kr
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Placeholder-sektioner */}
      <div className="space-y-2">
        {[
          { label: "EU-tilskud & ansøgninger", desc: "Grundbetaling, naturpleje, LEADER m.fl.", soon: true },
          { label: "Budgetplan", desc: "Sammenlign budget vs. faktisk forbrug", soon: true },
        ].map(({ label, desc }) => (
          <div key={label} className="rounded-xl px-4 py-3 opacity-40"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-sm font-semibold text-earth-200">{label}</p>
            <p className="text-xs text-earth-400 mt-0.5">{desc}</p>
            <span className="text-[10px] text-earth-600 mt-1 inline-block">Kommer snart</span>
          </div>
        ))}
      </div>
    </div>
  );
}
