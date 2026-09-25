"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getEstimatedMinutes, TASK_TYPE_LABELS, type TaskType } from "@/lib/taskTimeEstimates";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

export default function BedTaskForm({ bedId, farmId }: { bedId: string; farmId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
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
      bed_id: bedId,
      title: title.trim(),
      due_date: dueDate || null,
      category: "jordbrug",
      timing_type: "exact",
      source_type: "manual",
      task_type: taskType || null,
      estimated_minutes: estimatedMinutes,
    });
    setSaving(false);
    setTitle("");
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
        Tilføj opgave til dette bed
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">Ny opgave for bedet</p>
        <button type="button" onClick={() => setOpen(false)}>
          <X size={14} className="text-earth-500" />
        </button>
      </div>

      <input
        autoFocus
        className="input w-full text-sm"
        placeholder="Hvad skal gøres? fx Lugning"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Dato</label>
          <input
            type="date"
            className="input w-full mt-0.5 text-xs cursor-pointer"
            value={dueDate}
            onClick={openPicker}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-[10px]">Tidsregistrering</label>
          <select className="input w-full mt-0.5 text-xs" value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType | "")}>
            <option value="">Ingen</option>
            {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

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
