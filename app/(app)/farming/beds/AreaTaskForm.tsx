"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getEstimatedMinutes, TASK_TYPE_LABELS, type TaskType } from "@/lib/taskTimeEstimates";
import { createTaskSeries, type SeriesScope } from "@/lib/taskSeries";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const SCOPE_COLUMN: Record<SeriesScope["level"], "bed_id" | "bed_section_id" | "bed_planting_id"> = {
  bed: "bed_id",
  bed_section: "bed_section_id",
  bed_planting: "bed_planting_id",
};

export default function AreaTaskForm({
  farmId,
  scope,
  defaultEndDate,
  buttonLabel = "Tilføj opgave",
}: {
  farmId: string;
  scope: SeriesScope;
  defaultEndDate?: string | null;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskType, setTaskType] = useState<TaskType | "">("");
  const [repeat, setRepeat] = useState(false);
  const [frequencyDays, setFrequencyDays] = useState(7);
  const [endDate, setEndDate] = useState(defaultEndDate ?? "");
  const router = useRouter();
  const supabase = createClient();

  function reset() {
    setTitle("");
    setTaskType("");
    setRepeat(false);
    setEndDate(defaultEndDate ?? "");
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    if (repeat && taskType && endDate) {
      await createTaskSeries(supabase, {
        farmId,
        scope,
        title: title.trim(),
        taskType,
        frequencyDays,
        startDate: dueDate,
        endDate,
      });
    } else {
      const estimatedMinutes = taskType ? await getEstimatedMinutes(supabase, farmId, taskType) : null;
      await supabase.from("farm_tasks").insert({
        farm_id: farmId,
        [SCOPE_COLUMN[scope.level]]: scope.id,
        title: title.trim(),
        due_date: dueDate || null,
        category: "jordbrug",
        timing_type: "exact",
        source_type: "manual",
        task_type: taskType || null,
        estimated_minutes: estimatedMinutes,
      });
    }

    setSaving(false);
    reset();
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
        {buttonLabel}
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
        placeholder="Hvad skal gøres? fx Lugning"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">{repeat ? "Startdato" : "Dato"}</label>
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
        type="button"
        onClick={() => setRepeat((v) => !v)}
        disabled={!taskType}
        title={!taskType ? "Vælg en tidsregistreringstype for at kunne gentage" : undefined}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs disabled:opacity-40"
        style={{ background: repeat ? "rgba(163,230,53,0.1)" : "var(--surface-raised)", color: repeat ? "#a3e635" : "var(--text-muted)" }}
      >
        <span>Gentag opgaven med fast interval</span>
        <span>{repeat ? "✓" : ""}</span>
      </button>

      {repeat && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label text-[10px]">Interval</label>
            <select className="input w-full mt-0.5 text-xs" value={frequencyDays} onChange={(e) => setFrequencyDays(Number(e.target.value))}>
              <option value={7}>Hver uge</option>
              <option value={14}>Hver 2. uge</option>
            </select>
          </div>
          <div>
            <label className="label text-[10px]">Til og med</label>
            <input type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
              value={endDate} onClick={openPicker} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !title.trim() || (repeat && !endDate)}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40"
      >
        {saving ? "Gemmer…" : repeat ? "Opret gentagende opgave" : "Tilføj"}
      </button>
    </form>
  );
}
