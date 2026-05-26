"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const PRODUCT_TYPES = [
  { v: "æg",        l: "Æg" },
  { v: "slagtedyr", l: "Slagtedyr" },
  { v: "mælk",      l: "Mælk" },
  { v: "uld",       l: "Uld" },
  { v: "honning",   l: "Honning" },
  { v: "andet",     l: "Andet" },
] as const;

const CUSTOMER_TYPES = [
  { v: "gårdsalg",    l: "Gårdsalg" },
  { v: "restaurant",  l: "Restaurant" },
  { v: "butik",       l: "Butik" },
  { v: "privat",      l: "Privat" },
  { v: "ikke_solgt",  l: "Ikke solgt" },
  { v: "andet",       l: "Andet" },
] as const;

type AnimalLog = {
  id: string;
  log_date: string;
  product_type: string;
  animal_species: string | null;
  quantity: number;
  unit: string;
  sold_to_type: string | null;
  sold_to_name: string | null;
  price_per_unit: number | null;
  vat_included: boolean | null;
  notes: string | null;
};

const DA_MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
function fmtShort(d: string) {
  const date = new Date(d);
  return `${date.getDate()}. ${DA_MONTHS[date.getMonth()]}`;
}

const PRODUCT_LABEL: Record<string, string> = {
  æg: "Æg", slagtedyr: "Slagtedyr", mælk: "Mælk", uld: "Uld", honning: "Honning", andet: "Andet",
};
const CUSTOMER_LABEL: Record<string, string> = {
  gårdsalg: "Gårdsalg", restaurant: "Restaurant", butik: "Butik",
  privat: "Privat", ikke_solgt: "Ikke solgt", andet: "Andet",
};

export default function AnimalProductForm({
  farmId,
  recentLogs,
}: {
  farmId: string;
  recentLogs: AnimalLog[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productType, setProductType] = useState<string>("æg");
  const [species, setSpecies] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("stk");
  const [price, setPrice] = useState("");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [customerType, setCustomerType] = useState<string>("gårdsalg");
  const [soldTo, setSoldTo] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const defaultUnit = productType === "æg" ? "stk"
    : productType === "mælk" ? "liter"
    : productType === "uld" ? "kg"
    : "kg";

  function handleTypeChange(t: string) {
    setProductType(t);
    setUnit(t === "æg" ? "stk" : t === "mælk" ? "liter" : "kg");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!qty) return;
    setSaving(true);
    await supabase.from("animal_product_logs").insert({
      farm_id:        farmId,
      log_date:       date,
      product_type:   productType,
      animal_species: species || null,
      quantity:       Number(qty),
      unit,
      sold_to_type:   customerType,
      sold_to_name:   soldTo || null,
      price_per_unit: price ? Number(price) : null,
      vat_included:   vatIncluded,
      notes:          notes || null,
    });
    setSaving(false);
    setQty("");
    setPrice("");
    setSoldTo("");
    setSpecies("");
    setNotes("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* Tilføj-knap */}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", color: "var(--text-muted)" }}>
          <Plus size={15} />
          Registrér dyreprodukt
        </button>
      ) : (
        <form onSubmit={handleSave} className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-earth-300">Nyt registrering</p>
            <button type="button" onClick={() => setOpen(false)}>
              <X size={14} className="text-earth-500" />
            </button>
          </div>

          {/* Produkttype */}
          <div>
            <label className="label text-[10px]">Produkttype</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PRODUCT_TYPES.map(pt => (
                <button key={pt.v} type="button"
                  onClick={() => handleTypeChange(pt.v)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                  style={{
                    background: productType === pt.v ? "var(--clay, #c4622a)" : "var(--surface-raised)",
                    color: productType === pt.v ? "#fff" : "var(--text-muted)",
                  }}>
                  {pt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Dato + dyreart */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Dato</label>
              <input type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
                value={date} onClick={openPicker} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label text-[10px]">Dyreart / race (valgfrit)</label>
              <input className="input w-full mt-0.5 text-xs" placeholder="fx Høns, Lam"
                value={species} onChange={e => setSpecies(e.target.value)} />
            </div>
          </div>

          {/* Mængde + enhed */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Mængde</label>
              <div className="flex gap-1 mt-0.5">
                <input type="number" step="1" min="0"
                  className="input flex-1 text-xs" placeholder="0"
                  value={qty} onChange={e => setQty(e.target.value)} />
                <select className="input w-20 text-xs" value={unit} onChange={e => setUnit(e.target.value)}>
                  <option value="stk">stk</option>
                  <option value="kg">kg</option>
                  <option value="liter">liter</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label text-[10px]">Pris pr. {unit}</label>
              <input type="number" step="0.5" min="0"
                className="input w-full mt-0.5 text-xs" placeholder="—"
                value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>

          {/* Moms */}
          <div className="grid grid-cols-2 gap-2">
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
            <div>
              <label className="label text-[10px]">Salgskanal</label>
              <select className="input w-full mt-0.5 text-xs" value={customerType} onChange={e => setCustomerType(e.target.value)}>
                {CUSTOMER_TYPES.map(ct => <option key={ct.v} value={ct.v}>{ct.l}</option>)}
              </select>
            </div>
          </div>

          {/* Kundenavn + noter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Kundenavn (valgfrit)</label>
              <input className="input w-full mt-0.5 text-xs" placeholder="—"
                value={soldTo} onChange={e => setSoldTo(e.target.value)} />
            </div>
            <div>
              <label className="label text-[10px]">Note</label>
              <input className="input w-full mt-0.5 text-xs" placeholder="—"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={saving || !qty}
            className="w-full btn-primary text-sm py-2 disabled:opacity-40">
            {saving ? "Gemmer…" : "Gem registrering"}
          </button>
        </form>
      )}

      {/* Historik */}
      {recentLogs.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="divide-y divide-white/5">
            {recentLogs.map(log => {
              const revenue = log.price_per_unit ? log.quantity * log.price_per_unit : 0;
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-[11px] text-earth-500 w-14 flex-shrink-0 pt-0.5">{fmtShort(log.log_date)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-earth-100">
                      {PRODUCT_LABEL[log.product_type] ?? log.product_type}
                      {log.animal_species && <span className="text-earth-400"> · {log.animal_species}</span>}
                    </p>
                    <div className="flex gap-2 mt-0.5 text-[11px] text-earth-500">
                      <span>{log.quantity} {log.unit}</span>
                      {log.sold_to_type && log.sold_to_type !== "ikke_solgt" && (
                        <span>· {CUSTOMER_LABEL[log.sold_to_type] ?? log.sold_to_type}</span>
                      )}
                      {log.sold_to_name && <span>· {log.sold_to_name}</span>}
                      {log.notes && <span>· {log.notes}</span>}
                    </div>
                  </div>
                  {revenue > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold" style={{ color: "#a3e635" }}>
                        {Math.round(revenue).toLocaleString("da-DK")} kr
                      </p>
                      {log.vat_included === false && (
                        <p className="text-[10px] text-earth-500">ekskl.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
