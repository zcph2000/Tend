"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getEstimatedMinutes, TASK_TYPE_LABELS, type TaskType } from "@/lib/taskTimeEstimates";
import { createTaskSeries, FREQUENCY_OPTIONS, type SeriesScope } from "@/lib/taskSeries";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const SCOPE_COLUMN: Record<SeriesScope["level"], "bed_id" | "bed_section_id" | "bed_planting_id"> = {
  bed: "bed_id",
  bed_section: "bed_section_id",
  bed_planting: "bed_planting_id",
};

export type PlantingOption = { id: string; label: string; expectedHarvestAt: string | null };

export default function AreaTaskForm({
  farmId,
  scope,
  scopeLabel = "Hele bedet",
  plantingOptions,
  defaultEndDate,
  buttonLabel = "Tilføj opgave",
}: {
  farmId: string;
  scope: SeriesScope;
  scopeLabel?: string;
  /** Aktive afgrøder i bedet — lader brugeren vælge at knytte opgaven til én bestemt afgrøde i stedet for hele bedet. */
  plantingOptions?: PlantingOption[];
  defaultEndDate?: string | null;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<TaskType | "">("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [repeat, setRepeat] = useState(false);
  const [frequencyDays, setFrequencyDays] = useState(7);
  const [endDate, setEndDate] = useState(defaultEndDate ?? "");
  const [isRange, setIsRange] = useState(false);
  const [rangeEndDate, setRangeEndDate] = useState("");
  const [scopeChoice, setScopeChoice] = useState<string>("__area__"); // "__area__" = bed/sektion, ellers bed_planting id
  const router = useRouter();
  const supabase = createClient();

  const effectiveScope: SeriesScope =
    scopeChoice === "__area__" ? scope : { level: "bed_planting", id: scopeChoice };
  const effectiveScopeLabel =
    scopeChoice === "__area__" ? scopeLabel : plantingOptions?.find((p) => p.id === scopeChoice)?.label ?? scopeLabel;

  // Forventet høstdato for det der aktuelt er valgt i "Gælder for" — bruges til
  // at foreslå en fornuftig dato/slutdato ud fra den valgte opgavetype.
  function harvestDateForScope(choice: string): string | null {
    if (choice === "__area__") return defaultEndDate ?? null;
    return plantingOptions?.find((p) => p.id === choice)?.expectedHarvestAt ?? null;
  }

  function applyDateDefaults(type: TaskType | "", choice: string, isRepeat: boolean) {
    const harvest = harvestDateForScope(choice);
    if (!harvest) return;
    if (type === "høst") {
      setDueDate(harvest);
    }
    if (isRepeat && !endDate) {
      setEndDate(harvest);
    }
  }

  function reset() {
    setTaskType("");
    setNotes("");
    setRepeat(false);
    setEndDate(defaultEndDate ?? "");
    setIsRange(false);
    setRangeEndDate("");
    setScopeChoice("__area__");
    setError(null);
    setOpen(false);
  }

  function buildTitle(): string {
    const typeLabel = taskType ? TASK_TYPE_LABELS[taskType] : "Opgave";
    return `${typeLabel} — ${effectiveScopeLabel}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskType) return;
    setSaving(true);
    setError(null);
    const title = buildTitle();

    if (repeat && endDate) {
      const result = await createTaskSeries(supabase, {
        farmId,
        scope: effectiveScope,
        title,
        notes: notes.trim() || null,
        taskType,
        frequencyDays,
        startDate: dueDate,
        endDate,
      });
      if (result.error === "too_many") {
        setSaving(false);
        setError("Det bliver for mange forekomster (over 200) — vælg et kortere interval eller en tidligere slutdato.");
        return;
      }
    } else {
      const estimatedMinutes = await getEstimatedMinutes(supabase, farmId, taskType);
      await supabase.from("farm_tasks").insert({
        farm_id: farmId,
        [SCOPE_COLUMN[effectiveScope.level]]: effectiveScope.id,
        title,
        notes: notes.trim() || null,
        due_date: dueDate || null,
        due_date_end: isRange && rangeEndDate ? rangeEndDate : null,
        category: "jordbrug",
        timing_type: "exact",
        source_type: "manual",
        task_type: taskType,
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

      <div>
        <label className="label text-[10px]">Opgavetype</label>
        <select
          autoFocus
          className="input w-full mt-0.5 text-sm"
          value={taskType}
          onChange={(e) => {
            const v = e.target.value as TaskType | "";
            setTaskType(v);
            applyDateDefaults(v, scopeChoice, repeat);
          }}
        >
          <option value="">Vælg…</option>
          {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {plantingOptions && plantingOptions.length > 0 && (
        <div>
          <label className="label text-[10px]">Gælder for</label>
          <select
            className="input w-full mt-0.5 text-xs"
            value={scopeChoice}
            onChange={(e) => {
              const v = e.target.value;
              setScopeChoice(v);
              applyDateDefaults(taskType, v, repeat);
            }}
          >
            <option value="__area__">{scopeLabel}</option>
            {plantingOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      )}

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
        <label className="label text-[10px]">Noter (valgfrit)</label>
        <input
          className="input w-full mt-0.5 text-sm"
          placeholder={taskType === "andet" ? "Hvad skal der gøres?" : "Ekstra detaljer, fx hvor præcist"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !repeat;
            setRepeat(next);
            if (next) { setIsRange(false); applyDateDefaults(taskType, scopeChoice, true); }
          }}
          disabled={!taskType}
          title={!taskType ? "Vælg en opgavetype for at kunne gentage" : undefined}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs disabled:opacity-40"
          style={{ background: repeat ? "rgba(163,230,53,0.1)" : "var(--surface-raised)", color: repeat ? "#a3e635" : "var(--text-muted)" }}
        >
          <span>Gentag med interval</span>
          <span>{repeat ? "✓" : ""}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !isRange;
            setIsRange(next);
            if (next) setRepeat(false);
            else setRangeEndDate("");
          }}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
          style={{ background: isRange ? "rgba(163,230,53,0.1)" : "var(--surface-raised)", color: isRange ? "#a3e635" : "var(--text-muted)" }}
        >
          <span>Strækker sig over dage</span>
          <span>{isRange ? "✓" : ""}</span>
        </button>
      </div>

      {isRange && (
        <div>
          <label className="label text-[10px]">Til og med</label>
          <input type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
            value={rangeEndDate} min={dueDate} onClick={openPicker} onChange={(e) => setRangeEndDate(e.target.value)} />
        </div>
      )}

      {repeat && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label text-[10px]">Interval</label>
            <select className="input w-full mt-0.5 text-xs" value={frequencyDays} onChange={(e) => setFrequencyDays(Number(e.target.value))}>
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f.days} value={f.days}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-[10px]">Til og med</label>
            <input type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
              value={endDate} onClick={openPicker} onChange={(e) => setEndDate(e.target.value)} />
            {harvestDateForScope(scopeChoice) && (
              <p className="text-[10px] text-earth-600 mt-0.5">Foreslået ud fra forventet høst</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px]" style={{ color: "#f87171" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={saving || !taskType || (repeat && !endDate)}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40"
      >
        {saving ? "Gemmer…" : repeat ? "Opret gentagende opgave" : "Tilføj"}
      </button>
    </form>
  );
}
