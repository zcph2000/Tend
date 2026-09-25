"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NEW_DEPT = "__new__";

export default function NewBudgetForm({
  farmId,
  departments,
}: {
  farmId: string;
  departments: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [periodLabel, setPeriodLabel] = useState(String(new Date().getFullYear()));
  const [periodStart, setPeriodStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${new Date().getFullYear()}-12-31`);
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (departmentId === NEW_DEPT && !newDeptName.trim()) return;
    setSaving(true);

    let finalDepartmentId: string | null = departmentId || null;
    if (departmentId === NEW_DEPT) {
      const { data: newDept } = await supabase
        .from("departments")
        .insert({ farm_id: farmId, name: newDeptName.trim() })
        .select("id")
        .single();
      finalDepartmentId = newDept?.id ?? null;
    }

    const { data } = await supabase
      .from("operating_budgets")
      .insert({
        farm_id: farmId,
        department_id: finalDepartmentId,
        period_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select("id")
      .single();
    setSaving(false);
    if (data) router.push(`/operations/economy/budget/${data.id}`);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Nyt driftsbudget
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-50">Nyt driftsbudget</h3>

      <div>
        <label className="label">Afdeling</label>
        <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Hele gården</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
          <option value={NEW_DEPT}>+ Opret ny afdeling…</option>
        </select>
        {departmentId === NEW_DEPT && (
          <input
            autoFocus
            className="input mt-2"
            placeholder="Navn på ny afdeling, fx Æglæggere"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
          />
        )}
      </div>

      <div>
        <label className="label">Navn på periode</label>
        <input className="input" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="fx 2026" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Fra</label>
          <input type="date" className="input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </div>
        <div>
          <label className="label">Til</label>
          <input type="date" className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button
          onClick={handleSave}
          disabled={saving || !periodLabel || (departmentId === NEW_DEPT && !newDeptName.trim())}
          className="btn-primary flex-1"
        >
          {saving ? "Opretter…" : "Opret"}
        </button>
      </div>
    </div>
  );
}
