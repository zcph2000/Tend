"use client";

import { useState } from "react";
import { Plus, X, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import { TASK_TYPE_LABELS, type TaskType } from "@/lib/taskTimeEstimates";
import { buildDepartmentResolvers } from "@/lib/departmentAttribution";

type Source = "udgift" | "salg" | "arbejdstid";

/** Beregner [start, slut] for en periode med samme længde, der lige er endt
 * dagen før den nuværende periodes start — bruges til at slå "hvor mange
 * timer gik der sidste gang" op som forslag til en ny budgetlinje. */
function priorPeriod(periodStart: string, periodEnd: string): [string, string] {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const lengthMs = end.getTime() - start.getTime();
  const priorEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const priorStart = new Date(priorEnd.getTime() - lengthMs);
  return [priorStart.toISOString().slice(0, 10), priorEnd.toISOString().slice(0, 10)];
}

export default function BudgetLineForm({
  farmId,
  operatingBudgetId,
  departmentId,
  periodStart,
  periodEnd,
}: {
  farmId: string;
  operatingBudgetId: string;
  departmentId: string | null;
  periodStart: string;
  periodEnd: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<Source>("udgift");
  const [category, setCategory] = useState("foder");
  const [taskType, setTaskType] = useState<TaskType>("lugning");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [suggestedHours, setSuggestedHours] = useState<number | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function loadSuggestion(type: TaskType) {
    setLoadingSuggestion(true);
    setSuggestedHours(null);
    const [priorStart, priorEnd] = priorPeriod(periodStart, periodEnd);
    const [resolvers, { data: tasks }] = await Promise.all([
      buildDepartmentResolvers(supabase, farmId),
      supabase
        .from("farm_tasks")
        .select("actual_minutes, flock_id, bed_planting_id")
        .eq("farm_id", farmId)
        .eq("task_type", type)
        .eq("status", "done")
        .not("actual_minutes", "is", null)
        .gte("done_at", priorStart)
        .lte("done_at", priorEnd),
    ]);
    const matching = (tasks ?? []).filter((t) => {
      const d = resolvers.deptForFlockId(t.flock_id) ?? resolvers.deptForPlantingId(t.bed_planting_id);
      return departmentId === null ? true : d === departmentId;
    });
    const totalMinutes = matching.reduce((s, t) => s + (t.actual_minutes ?? 0), 0);
    setLoadingSuggestion(false);
    if (totalMinutes > 0) {
      const h = Math.round((totalMinutes / 60) * 10) / 10;
      setSuggestedHours(h);
      setHours((prev) => (prev ? prev : String(h)));
    }
  }

  function handleTaskTypeChange(v: TaskType) {
    setTaskType(v);
    loadSuggestion(v);
  }

  function handleSourceChange(v: Source) {
    setSource(v);
    if (v === "arbejdstid") loadSuggestion(taskType);
  }

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
    setDescription(""); setAmount(""); setHours(""); setSuggestedHours(null);
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
          <button key={opt.v} type="button" onClick={() => handleSourceChange(opt.v)}
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
          <select className="input w-full mt-0.5 text-sm" value={taskType} onChange={(e) => handleTaskTypeChange(e.target.value as TaskType)}>
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
          {loadingSuggestion && (
            <p className="text-[10px] text-earth-600 mt-1">Kigger på sidste periodes tal…</p>
          )}
          {!loadingSuggestion && suggestedHours !== null && (
            <button type="button" onClick={() => setHours(String(suggestedHours))}
              className="flex items-center gap-1 text-[10px] mt-1" style={{ color: "#a3e635" }}>
              <Lightbulb size={10} />
              Sidste tilsvarende periode: {suggestedHours}t — brugt som forslag, ret gerne til
            </button>
          )}
          {!loadingSuggestion && suggestedHours === null && (
            <p className="text-[10px] text-earth-600 mt-1">
              Ingen tidligere data for denne opgavetype endnu — dit eget skøn er startpunktet
            </p>
          )}
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
