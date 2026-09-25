"use client";

import { useState } from "react";
import { ListPlus, X, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES, type DepartmentOption } from "./ExpenseForm";
import { type FlockOption } from "./AnimalProductForm";

type BulkRow = {
  key: number;
  date: string;
  category: string;
  description: string;
  amount: string;
  isIncome: boolean;
  flockId: string;
  departmentId: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newRow(key: number): BulkRow {
  return { key, date: today(), category: "foder", description: "", amount: "", isIncome: false, flockId: "", departmentId: "" };
}

export default function BulkExpenseForm({
  farmId,
  flocks,
  departments = [],
}: {
  farmId: string;
  flocks: FlockOption[];
  departments?: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextKey, setNextKey] = useState(3);
  const [rows, setRows] = useState<BulkRow[]>([newRow(0), newRow(1), newRow(2)]);
  const router = useRouter();
  const supabase = createClient();

  function updateRow(key: number, patch: Partial<BulkRow>) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  }

  function addRow() {
    setRows(prev => [...prev, newRow(nextKey)]);
    setNextKey(k => k + 1);
  }

  function removeRow(key: number) {
    setRows(prev => prev.filter(r => r.key !== key));
  }

  const filledRows = rows.filter(r => r.amount);

  async function handleSaveAll() {
    if (filledRows.length === 0) return;
    setSaving(true);
    const payload = filledRows.map(r => ({
      farm_id: farmId,
      date: r.date,
      category: r.category,
      description: r.description || null,
      amount_dkk: Number(r.amount) * (r.isIncome ? 1 : -1),
      flock_id: r.flockId || null,
      department_id: r.departmentId || null,
    }));
    await supabase.from("farm_expenses").insert(payload);
    setSaving(false);
    setRows([newRow(nextKey), newRow(nextKey + 1), newRow(nextKey + 2)]);
    setNextKey(k => k + 3);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
        <ListPlus size={13} />
        Tilføj flere udgifter på én gang
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">Bulk-indtastning af udgifter/tilskud</p>
        <button type="button" onClick={() => setOpen(false)}>
          <X size={14} className="text-earth-500" />
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.key} className="rounded-lg p-2.5 space-y-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-earth-600">Linje {i + 1}</span>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(row.key)}>
                  <Trash2 size={11} className="text-earth-600" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <input type="date" className="input text-xs py-1 px-1.5"
                value={row.date} onChange={e => updateRow(row.key, { date: e.target.value })} />
              <select className="input text-xs py-1 px-1.5 col-span-1" value={row.category}
                onChange={e => updateRow(row.key, { category: e.target.value })}>
                {EXPENSE_CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
              <div className="flex gap-1">
                <input type="number" step="1" min="0" placeholder="Beløb"
                  className="input text-xs py-1 px-1.5 flex-1"
                  value={row.amount} onChange={e => updateRow(row.key, { amount: e.target.value })} />
                <button type="button"
                  onClick={() => updateRow(row.key, { isIncome: !row.isIncome })}
                  title={row.isIncome ? "Tilskud/salg" : "Udgift"}
                  className="w-7 flex-shrink-0 rounded-lg text-xs font-bold"
                  style={{
                    background: row.isIncome ? "rgba(163,230,53,0.15)" : "rgba(239,68,68,0.12)",
                    color: row.isIncome ? "#a3e635" : "#f87171",
                  }}>
                  {row.isIncome ? "+" : "−"}
                </button>
              </div>
            </div>
            <input className="input text-xs py-1 px-1.5 w-full" placeholder="Beskrivelse (valgfrit)"
              value={row.description} onChange={e => updateRow(row.key, { description: e.target.value })} />
            {(departments.length > 0 || flocks.length > 0) && (
              <div className="grid grid-cols-2 gap-1.5">
                {departments.length > 0 && (
                  <select className="input text-xs py-1 px-1.5" value={row.departmentId}
                    onChange={e => updateRow(row.key, { departmentId: e.target.value })}>
                    <option value="">Afdeling…</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
                {flocks.length > 0 && (
                  <select className="input text-xs py-1 px-1.5" value={row.flockId}
                    onChange={e => updateRow(row.key, { flockId: e.target.value })}>
                    <option value="">Flok…</option>
                    {flocks.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs"
        style={{ color: "var(--text-muted)" }}>
        <Plus size={12} /> Tilføj linje
      </button>

      <button type="button" onClick={handleSaveAll} disabled={saving || filledRows.length === 0}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40">
        {saving ? "Gemmer…" : `Gem ${filledRows.length || ""} ${filledRows.length === 1 ? "post" : "poster"}`}
      </button>
    </div>
  );
}
