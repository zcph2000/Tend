"use client";

import { useState, useMemo } from "react";
import { Plus, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const PRODUCT_TYPES = [
  { v: "æg",        l: "Æg",        unit: "stk" },
  { v: "slagtedyr", l: "Slagtedyr", unit: "kg"  },
  { v: "mælk",      l: "Mælk",      unit: "liter" },
  { v: "uld",       l: "Uld",       unit: "kg"  },
  { v: "honning",   l: "Honning",   unit: "kg"  },
  { v: "andet",     l: "Andet",     unit: "stk" },
] as const;

const CUSTOMER_TYPES = [
  { v: "gårdsalg",   l: "Gårdsalg"   },
  { v: "restaurant", l: "Restaurant" },
  { v: "butik",      l: "Butik"      },
  { v: "privat",     l: "Privat"     },
  { v: "ikke_solgt", l: "Ikke solgt" },
  { v: "andet",      l: "Andet"      },
] as const;

export type FlockOption  = { id: string; name: string; animalCount: number };
export type AnimalOption = { id: string; ear_tag: string; name: string | null; flock_id: string | null; species: string };

export type AnimalLog = {
  id: string;
  log_date: string;
  product_type: string;
  animal_species: string | null;
  flock_id: string | null;
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
const PRODUCT_LABEL:  Record<string, string> = { æg:"Æg", slagtedyr:"Slagtedyr", mælk:"Mælk", uld:"Uld", honning:"Honning", andet:"Andet" };
const CUSTOMER_LABEL: Record<string, string> = { gårdsalg:"Gårdsalg", restaurant:"Restaurant", butik:"Butik", privat:"Privat", ikke_solgt:"Ikke solgt", andet:"Andet" };

export default function AnimalProductForm({
  farmId,
  recentLogs,
  flocks,
  animals,
}: {
  farmId: string;
  recentLogs: AnimalLog[];
  flocks: FlockOption[];
  animals: AnimalOption[];
}) {
  const [open, setOpen]               = useState(false);
  const [saving, setSaving]           = useState(false);
  const [productType, setProductType] = useState("æg");
  const [flockId, setFlockId]         = useState("");
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [animalWeights, setAnimalWeights]     = useState<Record<string, string>>({});
  const [markSlaughtered, setMarkSlaughtered] = useState(true);
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty]                 = useState("");
  const [unit, setUnit]               = useState("stk");
  const [price, setPrice]             = useState("");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [customerType, setCustomerType] = useState("gårdsalg");
  const [soldTo, setSoldTo]           = useState("");
  const [notes, setNotes]             = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Dyr i valgt flok
  const flockAnimals = useMemo(() =>
    flockId ? animals.filter(a => a.flock_id === flockId) : animals,
    [flockId, animals]
  );

  // Total slagtevægt fra individuelle vægte
  const totalSlaughterWeight = useMemo(() =>
    selectedAnimals.reduce((sum, id) => sum + (parseFloat(animalWeights[id] ?? "0") || 0), 0),
    [selectedAnimals, animalWeights]
  );

  const isSlagtedyr        = productType === "slagtedyr";
  const useIndividualWeights = isSlagtedyr && selectedAnimals.length > 0;
  // Totalmængde til gem: individuelle kg ved slagtedyr, ellers fritekst-qty
  const effectiveQty = useIndividualWeights ? totalSlaughterWeight : parseFloat(qty) || 0;

  function handleTypeChange(t: string) {
    setProductType(t);
    const def = PRODUCT_TYPES.find(p => p.v === t)?.unit ?? "stk";
    setUnit(def);
    setSelectedAnimals([]);
    setAnimalWeights({});
  }

  function toggleAnimal(id: string) {
    setSelectedAnimals(prev => {
      if (prev.includes(id)) {
        // Ryd vægt når dyret fravælges
        setAnimalWeights(w => { const n = { ...w }; delete n[id]; return n; });
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  }

  function setWeight(id: string, val: string) {
    setAnimalWeights(prev => ({ ...prev, [id]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (effectiveQty <= 0 && !qty) return;
    setSaving(true);

    // 1. Gem produktlog med samlet vægt
    await supabase.from("animal_product_logs").insert({
      farm_id:        farmId,
      log_date:       date,
      product_type:   productType,
      animal_species: flockId ? (flocks.find(f => f.id === flockId)?.name ?? null) : null,
      flock_id:       flockId || null,
      quantity:       effectiveQty || Number(qty),
      unit,
      sold_to_type:   customerType,
      sold_to_name:   soldTo || null,
      price_per_unit: price ? Number(price) : null,
      vat_included:   vatIncluded,
      notes:          notes || null,
    });

    // 2. Slagtedyr: opret event pr. dyr med individuel vægt
    if (isSlagtedyr && selectedAnimals.length > 0) {
      await supabase.from("animal_events").insert(
        selectedAnimals.map(animalId => ({
          animal_id:  animalId,
          farm_id:    farmId,
          event_type: "slaughtering",
          event_date: date,
          data: {
            weight_kg:     parseFloat(animalWeights[animalId] ?? "0") || null,
            price_per_kg:  price ? Number(price) : null,
            sold_to:       soldTo || null,
            customer_type: customerType,
            vat_included:  vatIncluded,
          },
          notes: notes || null,
        }))
      );
      if (markSlaughtered) {
        await supabase.from("animals").update({ status: "sold" }).in("id", selectedAnimals);
      }
    }

    setSaving(false);
    setQty(""); setPrice(""); setSoldTo(""); setNotes("");
    setSelectedAnimals([]); setAnimalWeights({});
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", color: "var(--text-muted)" }}>
          <Plus size={15} />
          Registrér dyreprodukt eller salg
        </button>
      ) : (
        <form onSubmit={handleSave} className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-earth-300">Ny registrering</p>
            <button type="button" onClick={() => setOpen(false)}>
              <X size={14} className="text-earth-500" />
            </button>
          </div>

          {/* Produkttype */}
          <div>
            <label className="label text-[10px]">Produkttype</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PRODUCT_TYPES.map(pt => (
                <button key={pt.v} type="button" onClick={() => handleTypeChange(pt.v)}
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

          {/* Flok */}
          {flocks.length > 0 && (
            <div>
              <label className="label text-[10px]">Flok</label>
              <select className="input w-full mt-0.5 text-sm"
                value={flockId} onChange={e => { setFlockId(e.target.value); setSelectedAnimals([]); }}>
                <option value="">Vælg flok…</option>
                {flocks.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}{f.animalCount > 0 ? ` (${f.animalCount} dyr)` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Individuelle dyr — kun ved slagtedyr */}
          {isSlagtedyr && flockAnimals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="label text-[10px]">
                  Vælg dyr der slagtes
                  {selectedAnimals.length > 0 && (
                    <span className="ml-1 text-earth-400">({selectedAnimals.length} valgt)</span>
                  )}
                </label>
                {/* Løbende total */}
                {selectedAnimals.length > 0 && (
                  <span className="text-xs font-semibold" style={{ color: totalSlaughterWeight > 0 ? "#a3e635" : "var(--text-muted)" }}>
                    {totalSlaughterWeight > 0
                      ? `${totalSlaughterWeight % 1 === 0 ? totalSlaughterWeight : totalSlaughterWeight.toFixed(1)} kg i alt`
                      : "Udfyld kg →"}
                  </span>
                )}
              </div>

              <div className="rounded-lg overflow-hidden divide-y divide-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                {flockAnimals.map(a => {
                  const isSelected = selectedAnimals.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors"
                      style={{ background: isSelected ? "rgba(163,230,53,0.05)" : "transparent" }}
                    >
                      {/* Checkbox */}
                      <button type="button" onClick={() => toggleAnimal(a.id)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          borderColor: isSelected ? "#a3e635" : "rgba(255,255,255,0.2)",
                          background:  isSelected ? "rgba(163,230,53,0.2)" : "transparent",
                        }}>
                        {isSelected && <Check size={11} style={{ color: "#a3e635" }} />}
                      </button>

                      {/* Navn + øremærke */}
                      <button type="button" onClick={() => toggleAnimal(a.id)}
                        className="flex-1 min-w-0 text-left">
                        <span className="text-sm text-earth-100">{a.ear_tag}</span>
                        {a.name && <span className="text-earth-400 text-xs ml-1.5">{a.name}</span>}
                        <span className="text-[10px] text-earth-600 ml-1.5 capitalize">{a.species}</span>
                      </button>

                      {/* Individuel kg — vises kun når dyret er valgt */}
                      {isSelected && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="kg"
                            value={animalWeights[a.id] ?? ""}
                            onChange={e => setWeight(a.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="input w-20 text-xs text-right"
                            style={{ paddingRight: "6px" }}
                          />
                          <span className="text-[10px] text-earth-500">kg</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedAnimals.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ borderColor: markSlaughtered ? "#fb923c" : "rgba(255,255,255,0.2)", background: markSlaughtered ? "rgba(251,146,60,0.15)" : "transparent" }}
                    onClick={() => setMarkSlaughtered(v => !v)}
                  >
                    {markSlaughtered && <Check size={10} style={{ color: "#fb923c" }} />}
                  </div>
                  <span className="text-xs text-earth-400">Markér de valgte dyr som slagtet i dyreregistret</span>
                </label>
              )}
            </div>
          )}

          {/* Dato + mængde */}
          <div className={`grid gap-2 ${useIndividualWeights ? "grid-cols-1" : "grid-cols-2"}`}>
            <div>
              <label className="label text-[10px]">Dato</label>
              <input type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
                value={date} onClick={openPicker} onChange={e => setDate(e.target.value)} />
            </div>
            {/* Samlet mængde vises kun når individuelle kg IKKE udfyldes */}
            {!useIndividualWeights && (
              <div>
                <label className="label text-[10px]">Mængde</label>
                <div className="flex gap-1 mt-0.5">
                  <input type="number" step="0.1" min="0"
                    className="input flex-1 text-xs" placeholder="0"
                    value={qty} onChange={e => setQty(e.target.value)} />
                  <select className="input w-20 text-xs" value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="stk">stk</option>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Pris + moms */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Pris pr. {unit}</label>
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

          {/* Salgskanal */}
          <div>
            <label className="label text-[10px]">Salgskanal</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CUSTOMER_TYPES.map(ct => (
                <button key={ct.v} type="button" onClick={() => setCustomerType(ct.v)}
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
              <label className="label text-[10px]">Kundenavn</label>
              <input className="input w-full mt-0.5 text-xs" placeholder="—"
                value={soldTo} onChange={e => setSoldTo(e.target.value)} />
            </div>
            <div>
              <label className="label text-[10px]">Note</label>
              <input className="input w-full mt-0.5 text-xs" placeholder="—"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || (useIndividualWeights ? totalSlaughterWeight <= 0 : !qty)}
            className="w-full btn-primary text-sm py-2 disabled:opacity-40"
          >
            {saving ? "Gemmer…"
              : useIndividualWeights
                ? `Gem ${totalSlaughterWeight > 0 ? `${totalSlaughterWeight % 1 === 0 ? totalSlaughterWeight : totalSlaughterWeight.toFixed(1)} kg` : ""} · ${selectedAnimals.length} dyr${markSlaughtered ? " (markeres slagtet)" : ""}`
                : "Gem registrering"}
          </button>
        </form>
      )}

      {/* Historik */}
      {recentLogs.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="divide-y divide-white/5">
            {recentLogs.map(log => {
              const revenue = log.price_per_unit ? log.quantity * log.price_per_unit : 0;
              const flockName = flocks.find(f => f.id === log.flock_id)?.name;
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-[11px] text-earth-500 w-14 flex-shrink-0 pt-0.5">{fmtShort(log.log_date)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-earth-100">
                      {PRODUCT_LABEL[log.product_type] ?? log.product_type}
                      {flockName
                        ? <span className="text-earth-400"> · {flockName}</span>
                        : log.animal_species
                          ? <span className="text-earth-400"> · {log.animal_species}</span>
                          : null}
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
