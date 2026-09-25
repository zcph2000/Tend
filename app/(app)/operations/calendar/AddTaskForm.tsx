"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getEstimatedMinutes, TASK_TYPE_LABELS, type TaskType } from "@/lib/taskTimeEstimates";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const CATEGORIES = [
  { v: "jordbrug", l: "Jordbrug" },
  { v: "dyr",      l: "Dyr" },
  { v: "admin",    l: "Admin" },
  { v: "økonomi",  l: "Økonomi" },
  { v: "andet",    l: "Andet" },
] as const;

export default function AddTaskForm({
  farmId,
  defaultDate,
}: {
  farmId: string;
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [category, setCategory] = useState<string>("jordbrug");
  const [isRange, setIsRange] = useState(false);
  const [dueDateEnd, setDueDateEnd] = useState("");
  const [taskType, setTaskType] = useState<TaskType | "">("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const estimatedMinutes = taskType ? await getEstimatedMinutes(supabase, farmId, taskType) : null;
    await supabase.from("farm_tasks").insert({
      farm_id: farmId,
      title: title.trim(),
      due_date: dueDate || null,
      due_date_end: isRange && dueDateEnd ? dueDateEnd : null,
      category,
      timing_type: "exact",
      source_type: "manual",
      task_type: taskType || null,
      estimated_minutes: estimatedMinutes,
    });
    setSaving(false);
    setTitle("");
    setDueDate(defaultDate);
    setCategory("jordbrug");
    setIsRange(false);
    setDueDateEnd("");
    setTaskType("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 rounded-xl border-2 border-dashed text-xs transition-colors flex items-center justify-center gap-1.5"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "var(--text-muted, #a8a29e)" }}
      >
        <Plus size={13} />
        Tilføj opgave
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">Ny opgave</p>
        <button type="button" onClick={() => setOpen(false)}>
          <X size={14} className="text-earth-500" />
        </button>
      </div>

      <input
        autoFocus
        className="input w-full text-sm"
        placeholder="Hvad skal gøres?"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Dato</label>
          <input
            type="date"
            className="input w-full mt-0.5 text-xs cursor-pointer"
            value={dueDate}
            onClick={openPicker}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-[10px]">Kategori</label>
          <select className="input w-full mt-0.5 text-xs" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.v} value={c.v}>{c.l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label text-[10px]">Opgavetype (til tidsestimat, valgfrit)</label>
        <select className="input w-full mt-0.5 text-xs" value={taskType} onChange={e => setTaskType(e.target.value as TaskType | "")}>
          <option value="">Spor ikke tidsforbrug</option>
          {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {taskType && (
          <p className="text-[10px] text-earth-600 mt-1">
            Bruges kun til at gruppere med lignende opgaver, så et tidsestimat kan foreslås automatisk — titlen ovenfor er stadig den du ser i listen.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          const next = !isRange;
          setIsRange(next);
          if (!next) setDueDateEnd("");
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs"
        style={{ background: isRange ? "rgba(163,230,53,0.1)" : "var(--surface-raised)", color: isRange ? "#a3e635" : "var(--text-muted)" }}
      >
        <span>Strækker sig over flere dage</span>
        <span>{isRange ? "✓" : ""}</span>
      </button>

      {isRange && (
        <div>
          <label className="label text-[10px]">Til og med</label>
          <input
            type="date"
            className="input w-full mt-0.5 text-xs cursor-pointer"
            value={dueDateEnd}
            min={dueDate}
            onClick={openPicker}
            onChange={e => setDueDateEnd(e.target.value)}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40"
      >
        {saving ? "Gemmer…" : "Tilføj"}
      </button>
    </form>
  );
}
