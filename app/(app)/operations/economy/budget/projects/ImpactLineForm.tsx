"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ImpactLineForm({
  farmId,
  projectId,
  departments,
  defaultDepartmentId,
}: {
  farmId: string;
  projectId: string;
  departments: { id: string; name: string }[];
  defaultDepartmentId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [revenueDelta, setRevenueDelta] = useState("");
  const [costDelta, setCostDelta] = useState("");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!revenueDelta && !costDelta) return;
    setSaving(true);
    await supabase.from("project_operating_impact").insert({
      farm_id: farmId,
      project_id: projectId,
      department_id: departmentId || null,
      description: description || null,
      estimated_annual_revenue_delta_dkk: revenueDelta ? Number(revenueDelta) : 0,
      estimated_annual_cost_delta_dkk: costDelta ? Number(costDelta) : 0,
    });
    setSaving(false);
    setDescription(""); setRevenueDelta(""); setCostDelta("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
        <Plus size={13} />
        Tilføj forventet driftspåvirkning
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">Ny driftspåvirkning</p>
        <button type="button" onClick={() => setOpen(false)}><X size={14} className="text-earth-500" /></button>
      </div>
      <p className="text-[11px] text-earth-500">
        Hvad ændrer projektet ved den løbende drift pr. år? Fx "100 flere høns: mere foder, mere ægsalg".
      </p>

      <div>
        <label className="label text-[10px]">Beskrivelse</label>
        <input className="input w-full mt-0.5 text-sm" placeholder="fx 100 flere høns"
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {departments.length > 0 && (
        <div>
          <label className="label text-[10px]">Afdeling</label>
          <select className="input w-full mt-0.5 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Ingen specifik</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Mere indtægt/år (kr)</label>
          <input type="number" step="1" min="0" className="input w-full mt-0.5 text-sm" placeholder="0"
            value={revenueDelta} onChange={(e) => setRevenueDelta(e.target.value)} />
        </div>
        <div>
          <label className="label text-[10px]">Mere udgift/år (kr)</label>
          <input type="number" step="1" min="0" className="input w-full mt-0.5 text-sm" placeholder="0"
            value={costDelta} onChange={(e) => setCostDelta(e.target.value)} />
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={saving || (!revenueDelta && !costDelta)}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40">
        {saving ? "Gemmer…" : "Tilføj"}
      </button>
    </div>
  );
}
