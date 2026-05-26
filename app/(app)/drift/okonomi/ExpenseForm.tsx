"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { type FlockOption } from "./AnimalProductForm";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const CATEGORIES = [
  { v: "foder",       l: "Foder / tilskudsfoder" },
  { v: "veterinær",   l: "Veterinær / ormekur"   },
  { v: "redskaber",   l: "Redskaber / hegn"       },
  { v: "maskiner",    l: "Maskiner / trailer"     },
  { v: "frø",         l: "Frø / planter"          },
  { v: "gødning",     l: "Gødning"                },
  { v: "forpagning",  l: "Forpagning"             },
  { v: "tilskud",     l: "Tilskud (positiv)"      },
  { v: "løn",         l: "Løn"                    },
  { v: "andet",       l: "Andet"                  },
] as const;

export default function ExpenseForm({
  farmId,
  flocks,
}: {
  farmId: string;
  flocks: FlockOption[];
}) {
  const [open, setOpen]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory]   = useState("foder");
  const [description, setDesc]    = useState("");
  const [amount, setAmount]       = useState("");
  const [isIncome, setIsIncome]   = useState(false);
  const [flockId, setFlockId]     = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);
    const amountVal = Number(amount) * (isIncome ? 1 : -1);
    await supabase.from("farm_expenses").insert({
      farm_id:     farmId,
      date,
      category,
      description: description || null,
      amount_dkk:  amountVal,
      flock_id:    flockId || null,
    });
    setSaving(false);
    setDesc(""); setAmount(""); setFlockId("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-colors"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", color: "var(--text-muted)" }}>
        <Plus size={15} />
        Registrér udgift eller tilskud
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">Ny udgift / tilskud</p>
        <button type="button" onClick={() => setOpen(false)}>
          <X size={14} className="text-earth-500" />
        </button>
      </div>

      {/* Udgift / tilskud toggle */}
      <div className="flex gap-1">
        {[{ v: false, l: "Udgift" }, { v: true, l: "Tilskud / salg" }].map(opt => (
          <button key={String(opt.v)} type="button"
            onClick={() => { setIsIncome(opt.v); if (opt.v) setCategory("tilskud"); }}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: isIncome === opt.v ? (opt.v ? "rgba(163,230,53,0.15)" : "rgba(239,68,68,0.12)") : "var(--surface-raised)",
              color: isIncome === opt.v ? (opt.v ? "#a3e635" : "#f87171") : "var(--text-muted)",
            }}>
            {opt.l}
          </button>
        ))}
      </div>

      {/* Dato + beløb */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Dato</label>
          <input type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
            value={date} onClick={openPicker} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label text-[10px]">Beløb (kr)</label>
          <input type="number" step="1" min="0"
            className="input w-full mt-0.5 text-xs" placeholder="0"
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
      </div>

      {/* Kategori */}
      <div>
        <label className="label text-[10px]">Kategori</label>
        <select className="input w-full mt-0.5 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
      </div>

      {/* Beskrivelse */}
      <div>
        <label className="label text-[10px]">Beskrivelse</label>
        <input className="input w-full mt-0.5 text-sm" placeholder="fx Ormekur til lam, maj 2026"
          value={description} onChange={e => setDesc(e.target.value)} />
      </div>

      {/* Flok-tilknytning */}
      {flocks.length > 0 && (
        <div>
          <label className="label text-[10px]">Tilknyt til flok (valgfrit)</label>
          <select className="input w-full mt-0.5 text-sm" value={flockId} onChange={e => setFlockId(e.target.value)}>
            <option value="">Ingen specifik flok</option>
            {flocks.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      )}

      <button type="submit" disabled={saving || !amount}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40">
        {saving ? "Gemmer…" : "Gem"}
      </button>
    </form>
  );
}
