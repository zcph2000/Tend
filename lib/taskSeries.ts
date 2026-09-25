import type { SupabaseClient } from "@supabase/supabase-js";
import { getEstimatedMinutes, type TaskType } from "@/lib/taskTimeEstimates";

export type SeriesScope =
  | { level: "bed_planting"; id: string }
  | { level: "bed"; id: string }
  | { level: "bed_section"; id: string };

export const FREQUENCY_OPTIONS: { days: number; label: string }[] = [
  { days: 1,   label: "Dagligt" },
  { days: 2,   label: "Hver 2. dag" },
  { days: 3,   label: "Hver 3. dag" },
  { days: 7,   label: "Ugentligt" },
  { days: 14,  label: "Hver 2. uge" },
  { days: 30,  label: "Månedligt" },
  { days: 365, label: "Årligt" },
];

const MAX_OCCURRENCES = 200;

function scopeColumn(scope: SeriesScope) {
  switch (scope.level) {
    case "bed_planting": return "bed_planting_id" as const;
    case "bed":           return "bed_id" as const;
    case "bed_section":   return "bed_section_id" as const;
  }
}

function occurrenceDates(startDate: string, endDate: string, frequencyDays: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + frequencyDays);
  }
  return dates;
}

export async function createTaskSeries(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    scope: SeriesScope;
    title: string;
    taskType: TaskType;
    category?: string;
    frequencyDays: number;
    startDate: string;
    endDate: string;
  }
): Promise<{ seriesId: string | null; occurrences: number; error?: "too_many" }> {
  const { farmId, scope, title, taskType, category = "jordbrug", frequencyDays, startDate, endDate } = params;
  const column = scopeColumn(scope);

  if (occurrenceDates(startDate, endDate, frequencyDays).length > MAX_OCCURRENCES) {
    return { seriesId: null, occurrences: 0, error: "too_many" };
  }

  const { data: series } = await supabase
    .from("task_series")
    .insert({
      farm_id: farmId,
      [column]: scope.id,
      title,
      task_type: taskType,
      category,
      frequency_days: frequencyDays,
      start_date: startDate,
      end_date: endDate,
    })
    .select("id")
    .single();

  if (!series) return { seriesId: null, occurrences: 0 };

  const dates = occurrenceDates(startDate, endDate, frequencyDays);
  if (dates.length === 0) return { seriesId: series.id, occurrences: 0 };

  const estimatedMinutes = await getEstimatedMinutes(supabase, farmId, taskType);

  const rows = dates.map((dueDate) => ({
    farm_id: farmId,
    [column]: scope.id,
    series_id: series.id,
    title,
    due_date: dueDate,
    category,
    timing_type: "exact",
    source_type: "manual",
    task_type: taskType,
    estimated_minutes: estimatedMinutes,
  }));

  await supabase.from("farm_tasks").insert(rows);
  return { seriesId: series.id, occurrences: dates.length };
}

export async function endTaskSeries(supabase: SupabaseClient, seriesId: string): Promise<void> {
  await supabase.from("task_series").update({ status: "afsluttet" }).eq("id", seriesId);
  await supabase
    .from("farm_tasks")
    .update({ status: "skipped" })
    .eq("series_id", seriesId)
    .eq("status", "pending");
}

export type SeriesTaskRow = {
  id: string;
  status: string;
  estimated_minutes: number | null;
  actual_minutes: number | null;
};

export function summarizeSeries(tasks: SeriesTaskRow[]) {
  const pending = tasks.filter((t) => t.status === "pending").length;
  const totalEstimatedMinutes = tasks.reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);
  const totalActualMinutes = tasks.reduce((s, t) => s + (t.actual_minutes ?? 0), 0);
  return { totalOccurrences: tasks.length, pending, totalEstimatedMinutes, totalActualMinutes };
}
