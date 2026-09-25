import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskType =
  | "såning"
  | "udplantning"
  | "lugning"
  | "høst"
  | "dyrepasning"
  | "flokflytning"
  | "andet";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  såning: "Såning",
  udplantning: "Udplantning",
  lugning: "Lugning",
  høst: "Høst",
  dyrepasning: "Dyrepasning",
  flokflytning: "Flokflytning",
  andet: "Andet",
};

// Startgæt indtil der findes egne loggede tal for den givne opgavetype —
// erstattes automatisk af et gennemsnit af de seneste faktiske tider, så
// snart der findes historik (se getEstimatedMinutes).
const DEFAULT_MINUTES: Record<TaskType, number> = {
  såning: 20,
  udplantning: 45,
  lugning: 30,
  høst: 30,
  dyrepasning: 15,
  flokflytning: 20,
  andet: 20,
};

const HISTORY_SAMPLE_SIZE = 10;

function average(values: number[]): number {
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export async function getEstimatedMinutes(
  supabase: SupabaseClient,
  farmId: string,
  taskType: TaskType
): Promise<number> {
  const { data } = await supabase
    .from("farm_tasks")
    .select("actual_minutes")
    .eq("farm_id", farmId)
    .eq("task_type", taskType)
    .not("actual_minutes", "is", null)
    .order("done_at", { ascending: false })
    .limit(HISTORY_SAMPLE_SIZE);

  const minutes = (data ?? []).map((r) => r.actual_minutes as number).filter((n) => n > 0);
  return minutes.length > 0 ? average(minutes) : DEFAULT_MINUTES[taskType];
}

const DEFAULT_MOVE_MINUTES = 20;

export async function getEstimatedMoveMinutes(
  supabase: SupabaseClient,
  farmId: string
): Promise<number> {
  const { data } = await supabase
    .from("grazing_records")
    .select("actual_move_minutes")
    .eq("farm_id", farmId)
    .not("actual_move_minutes", "is", null)
    .order("start_date", { ascending: false })
    .limit(HISTORY_SAMPLE_SIZE);

  const minutes = (data ?? []).map((r) => r.actual_move_minutes as number).filter((n) => n > 0);
  return minutes.length > 0 ? average(minutes) : DEFAULT_MOVE_MINUTES;
}
