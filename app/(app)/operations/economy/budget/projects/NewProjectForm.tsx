"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  const [description, setDescription] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!name) return;
    setSaving(true);
    const { data } = await supabase
      .from("budget_projects")
      .insert({
        farm_id: farmId,
        name,
        department_id: departmentId || null,
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
        </select>
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
        <button onClick={handleSave} disabled={saving || !name} className="btn-primary flex-1">
          {saving ? "Opretter…" : "Opret"}
        </button>
      </div>
    </div>
  );
}
