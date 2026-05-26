"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const CUSTOMER_TYPES = [
  { v: "gårdsalg",   l: "Gårdsalg" },
  { v: "restaurant", l: "Restaurant" },
  { v: "butik",      l: "Butik" },
  { v: "privat",     l: "Privat" },
  { v: "andet",      l: "Andet" },
] as const;

const UNITS = ["kg", "stk", "liter", "bundt"] as const;

export type HarvestLogEntry = {
  id: string;
  harvest_date: string;
  quantity_kg: number | null;
  quantity_unit: string | null;
  price_per_kg: number | null;
  sold_to: string | null;
  customer_type: string | null;
  vat_included: boolean | null;
  notes: string | null;
};

export type PlantingRowData = {
  id: string;
  cropLabel: string;
  bedId: string;
  expectedHarvestAt: string | null;
  logs: HarvestLogEntry[];
};

const DA_MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
function fmtShort(d: string) {
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

export default function PlantingHarvestRow({
  planting,
  farmId,
  defaultOpen = false,
}: {
  planting: PlantingRowData;
  farmId: string;
  defaultOpen?: boolean;
}) {
  const [formOpen, setFormOpen] = useState(defaultOpen);
  const [logsOpen, setLogsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<typeof UNITS[number]>("kg");
  const [price, setPrice] = useState("");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [customerType, setCustomerType] = useState<string>("gårdsalg");
  const [soldTo, setSoldTo] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const totalHarvested = planting.logs.reduce((s, l) => s + (l.quantity_kg ?? 0), 0);
  const totalRevenue   = planting.logs.reduce((s, l) => s + ((l.quantity_kg ?? 0) * (l.price_per_kg ?? 0)), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!qty) return;
    setSaving(true);
    await supabase.from("harvest_logs").insert({
      farm_id:       farmId,
      planting_id:   planting.id,
      bed_id:        planting.bedId,
      harvest_date:  date,
      quantity_kg:   Number(qty),
      quantity_unit: unit,
      price_per_kg:  price ? Number(price) : null,
      sold_to:       soldTo || null,
      customer_type: customerType || null,
      vat_included:  vatIncluded,
      notes:         notes || null,
    });
    setSaving(false);
    setQty("");
    setPrice("");
    setSoldTo("");
    setNotes("");
    setFormOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Hoved-række */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-earth-100 truncate">{planting.cropLabel}</p>
          {planting.expectedHarvestAt && (
            <p className="text-[11px] text-earth-500 mt-0.5">
              Forventet: {fmtShort(planting.expectedHarvestAt)}
            </p>
          )}
        </div>

        {/* Høstet + omsætning */}
        <div className="text-right flex-shrink-0 min-w-[80px]">
          {totalHarvested > 0 ? (
            <>
              <p className="text-xs font-semibold text-earth-100">
                {totalHarvested % 1 === 0 ? totalHarvested : totalHarvested.toFixed(1)} kg
              </p>
              {totalRevenue > 0 && (
                <p className="text-[11px]" style={{ color: "#a3e635" }}>
                  {Math.round(totalRevenue).toLocaleString("da-DK")} kr
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-earth-600">Ikke høstet</p>
          )}
        </div>

        {/* Knapper */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {planting.logs.length > 0 && (
            <button
              type="button"
              onClick={() => setLogsOpen(v => !v)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              title="Se registreringer"
            >
              {logsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFormOpen(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: formOpen ? "var(--clay, #c4622a)" : "rgba(163,230,53,0.12)",
              color: formOpen ? "#fff" : "#a3e635",
            }}
          >
            {formOpen ? <X size={11} /> : <Plus size={11} />}
            {formOpen ? "Luk" : "Registrér"}
          </button>
        </div>
      </div>

      {/* Tidligere registreringer */}
      {logsOpen && planting.logs.length > 0 && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {planting.logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-2 text-xs">
              <span className="text-earth-500 w-14 flex-shrink-0 pt-0.5">{fmtShort(log.harvest_date)}</span>
              <span className="text-earth-300">
                {log.quantity_kg} {log.quantity_unit ?? "kg"}
              </span>
              {log.price_per_kg && (
                <span className="text-earth-400">
                  · {log.price_per_kg} kr/{log.quantity_unit ?? "kg"}
                  {log.vat_included === false && " ekskl. moms"}
                </span>
              )}
              {log.sold_to && <span className="text-earth-500">· {log.sold_to}</span>}
              {log.customer_type && (
                <span className="text-earth-600 capitalize">· {log.customer_type}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Registreringsformular */}
      {formOpen && (
        <form onSubmit={handleSave} className="border-t border-white/5 px-4 py-3 space-y-3"
          style={{ background: "rgba(255,255,255,0.02)" }}>

          {/* Dato + mængde */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Høstdato</label>
              <input type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
                value={date} onClick={openPicker} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label text-[10px]">Mængde</label>
              <div className="flex gap-1 mt-0.5">
                <input type="number" step="0.1" min="0"
                  className="input flex-1 text-xs" placeholder="0"
                  value={qty} onChange={e => setQty(e.target.value)} />
                <select className="input w-20 text-xs" value={unit} onChange={e => setUnit(e.target.value as typeof UNITS[number])}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pris + moms */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Salgspris (kr/{unit})</label>
              <input type="number" step="0.5" min="0"
                className="input w-full mt-0.5 text-xs" placeholder="—"
                value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="label text-[10px]">Moms</label>
              <div className="flex gap-1 mt-1">
                {[{ v: true, l: "Inkl." }, { v: false, l: "Ekskl." }].map(opt => (
                  <button key={String(opt.v)} type="button"
                    onClick={() => setVatIncluded(opt.v)}
                    className="flex-1 py-1 rounded-lg text-xs transition-colors"
                    style={{
                      background: vatIncluded === opt.v ? "var(--clay, #c4622a)" : "var(--surface)",
                      color: vatIncluded === opt.v ? "#fff" : "var(--text-muted)",
                    }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Kundetype */}
          <div>
            <label className="label text-[10px]">Salgskanal</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CUSTOMER_TYPES.map(ct => (
                <button key={ct.v} type="button"
                  onClick={() => setCustomerType(ct.v)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                  style={{
                    background: customerType === ct.v ? "rgba(163,230,53,0.15)" : "var(--surface)",
                    color: customerType === ct.v ? "#a3e635" : "var(--text-muted)",
                    border: customerType === ct.v ? "1px solid rgba(163,230,53,0.3)" : "1px solid transparent",
                  }}>
                  {ct.l}
                </button>
              ))}
            </div>
          </div>

          {/* Kundenavn + noter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Kundenavn (valgfrit)</label>
              <input className="input w-full mt-0.5 text-xs" placeholder="fx Restaurant Noma"
                value={soldTo} onChange={e => setSoldTo(e.target.value)} />
            </div>
            <div>
              <label className="label text-[10px]">Note (valgfrit)</label>
              <input className="input w-full mt-0.5 text-xs" placeholder="—"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={saving || !qty}
            className="w-full btn-primary text-sm py-2 disabled:opacity-40">
            {saving ? "Gemmer…" : "Gem høst"}
          </button>
        </form>
      )}
    </div>
  );
}
