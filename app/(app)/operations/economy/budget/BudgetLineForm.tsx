"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import { TASK_TYPE_LABELS, type TaskType } from "@/lib/taskTimeEstimates";

type Source = "udgift" | "salg" | "arbejdstid";

export default function BudgetLineForm({
  farmId,
  operatingBudgetId,
}: {
  farmId: string;
  operatingBudgetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<Source>("udgift");
  const [category, setCategory] = useState("foder");
  const [taskType, setTaskType] = useState<TaskType>("lugning");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    await supabase.from("budget_lines").insert({
      farm_id: farmId,
      operating_budget_id: operatingBudgetId,
      source,
      category: source === "udgift" ? category : null,
      task_type: source === "arbejdstid" ? taskType : null,
      description: description || null,
      estimated_amount_dkk: source === "arbejdstid" ? null : Number(amount) * (source === "udgift" ? -1 : 1),
      estimated_hours: source === "arbejdstid" ? Number(hours) : null,
    });
    setSaving(false);
    setDescription(""); setAmount(""); setHours("");
    setOpen(false);
    router.refresh();
  }

  const canSave = source === "arbejdstid" ? !!hours : !!amount;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
        <Plus size={13} />
        Tilføj budgetlinje
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">Ny budgetlinje</p>
        <button type="button" onClick={() => setOpen(false)}><X size={14} className="text-earth-500" /></button>
      </div>

      <div className="flex gap-1">
        {([
          { v: "udgift" as const, l: "Udgift" },
          { v: "salg" as const, l: "Forventet salg" },
          { v: "arbejdstid" as const, l: "Arbejdstid" },
        ]).map((opt) => (
          <button key={opt.v} type="button" onClick={() => setSource(opt.v)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: source === opt.v ? "rgba(163,230,53,0.15)" : "var(--surface-raised)",
              color: source === opt.v ? "#a3e635" : "var(--text-muted)",
            }}>
            {opt.l}
          </button>
        ))}
      </div>

      {source === "udgift" && (
        <div>
          <label className="label text-[10px]">Kategori</label>
          <select className="input w-full mt-0.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </div>
      )}

      {source === "arbejdstid" && (
        <div>
          <label className="label text-[10px]">Opgavetype</label>
          <select className="input w-full mt-0.5 text-sm" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)}>
            {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label text-[10px]">Beskrivelse (valgfrit)</label>
        <input className="input w-full mt-0.5 text-sm" placeholder="fx Foder til vinteren"
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {source === "arbejdstid" ? (
        <div>
          <label className="label text-[10px]">Skønnede timer</label>
          <input type="number" step="1" min="0" className="input w-full mt-0.5 text-sm" placeholder="fx 40"
            value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
      ) : (
        <div>
          <label className="label text-[10px]">Skønnet beløb (kr)</label>
          <input type="number" step="1" min="0" className="input w-full mt-0.5 text-sm" placeholder="0"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      )}

      <button type="button" onClick={handleSave} disabled={saving || !canSave}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40">
        {saving ? "Gemmer…" : "Tilføj linje"}
      </button>
    </div>
  );
}
