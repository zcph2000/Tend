"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { type FlockOption } from "./AnimalProductForm";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

export type DepartmentOption = { id: string; name: string };

export type ExpenseRecord = {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount_dkk: number;
  flock_id: string | null;
  department_id: string | null;
};

export default function ExpenseForm({
  farmId,
  flocks,
  departments = [],
  existing,
  onDone,
}: {
  farmId: string;
  flocks: FlockOption[];
  departments?: DepartmentOption[];
  /** Når sat: formularen redigerer denne udgift i stedet for at oprette en ny. */
  existing?: ExpenseRecord;
  /** Kaldes efter gem/slet ved redigering, så den indlejrende komponent kan lukke formularen. */
  onDone?: () => void;
}) {
  const isEdit = !!existing;
  const [open, setOpen]           = useState(isEdit);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [date, setDate]           = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [category, setCategory]   = useState(existing?.category ?? "foder");
  const [description, setDesc]    = useState(existing?.description ?? "");
  const [amount, setAmount]       = useState(existing ? String(Math.abs(existing.amount_dkk)) : "");
  const [isIncome, setIsIncome]   = useState(existing ? existing.amount_dkk >= 0 : false);
  const [flockId, setFlockId]     = useState(existing?.flock_id ?? "");
  const [departmentId, setDepartmentId] = useState(existing?.department_id ?? "");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);
    const amountVal = Number(amount) * (isIncome ? 1 : -1);
    const payload = {
      date,
      category,
      description: description || null,
      amount_dkk:  amountVal,
      flock_id:    flockId || null,
      department_id: departmentId || null,
    };
    if (isEdit) {
      await supabase.from("farm_expenses").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("farm_expenses").insert({ farm_id: farmId, ...payload });
    }
    setSaving(false);
    if (isEdit) {
      onDone?.();
    } else {
      setDesc(""); setAmount(""); setFlockId(""); setDepartmentId("");
      setOpen(false);
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await supabase.from("farm_expenses").delete().eq("id", existing.id);
    setDeleting(false);
    onDone?.();
    router.refresh();
  }

  if (!open && !isEdit) {
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
        <p className="text-xs font-semibold text-earth-300">{isEdit ? "Rediger udgift / tilskud" : "Ny udgift / tilskud"}</p>
        {!isEdit && (
          <button type="button" onClick={() => setOpen(false)}>
            <X size={14} className="text-earth-500" />
          </button>
        )}
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
          {EXPENSE_CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
      </div>

      {/* Beskrivelse */}
      <div>
        <label className="label text-[10px]">Beskrivelse</label>
        <input className="input w-full mt-0.5 text-sm" placeholder="fx Ormekur til lam, maj 2026"
          value={description} onChange={e => setDesc(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Afdeling */}
        {departments.length > 0 && (
          <div>
            <label className="label text-[10px]">Afdeling (valgfrit)</label>
            <select className="input w-full mt-0.5 text-sm" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
              <option value="">Ingen</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {/* Flok-tilknytning */}
        {flocks.length > 0 && (
          <div>
            <label className="label text-[10px]">Flok (valgfrit)</label>
            <select className="input w-full mt-0.5 text-sm" value={flockId} onChange={e => setFlockId(e.target.value)}>
              <option value="">Ingen</option>
              {flocks.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isEdit && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="py-2 px-3 rounded-xl text-sm font-medium transition-colors"
            style={{ background: confirmDelete ? "#dc2626" : "rgba(239,68,68,0.12)", color: confirmDelete ? "#fff" : "#f87171" }}>
            {deleting ? "Sletter…" : confirmDelete ? "Bekræft" : "Slet"}
          </button>
        )}
        {isEdit && (
          <button type="button" onClick={() => onDone?.()} className="btn-secondary flex-1 text-sm py-2">
            Annuller
          </button>
        )}
        <button type="submit" disabled={saving || !amount}
          className="flex-1 btn-primary text-sm py-2 disabled:opacity-40">
          {saving ? "Gemmer…" : isEdit ? "Gem ændringer" : "Gem"}
        </button>
      </div>
    </form>
  );
}
