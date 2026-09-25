"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NEW_DEPT = "__new__";

export default function NewProjectForm({
  farmId,
  departments,
}: {
  farmId: string;
  departments: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [description, setDescription] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!name) return;
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
      .from("budget_projects")
      .insert({
        farm_id: farmId,
        name,
        department_id: finalDepartmentId,
        description: description || null,
        expected_outcome: expectedOutcome || null,
        target_date: targetDate || null,
        status: "planlagt",
      })
      .select("id")
      .single();
    setSaving(false);
    if (data) router.push(`/operations/economy/budget/projects/${data.id}`);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Nyt projekt
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-50">Nyt opstartsprojekt</h3>

      <div>
        <label className="label">Navn *</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="fx Nyt hønsehus" />
      </div>

      <div>
        <label className="label">Afdeling</label>
        <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Hele gården / tværgående</option>
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
        <label className="label">Beskrivelse</label>
        <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Hvad går projektet ud på?" />
      </div>

      <div>
        <label className="label">Forventet gevinst</label>
        <textarea className="input" rows={2} value={expectedOutcome} onChange={(e) => setExpectedOutcome(e.target.value)}
          placeholder="fx Kan rumme 20 flere høns" />
      </div>

      <div>
        <label className="label">Måldato (valgfrit)</label>
        <input type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button
          onClick={handleSave}
          disabled={saving || !name || (departmentId === NEW_DEPT && !newDeptName.trim())}
          className="btn-primary flex-1"
        >
          {saving ? "Opretter…" : "Opret"}
        </button>
      </div>
    </div>
  );
}
