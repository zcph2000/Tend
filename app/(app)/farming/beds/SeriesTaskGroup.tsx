"use client";

import { useState } from "react";
import { Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { endTaskSeries, summarizeSeries, type SeriesTaskRow } from "@/lib/taskSeries";
import CheckTaskButton from "@/app/(app)/operations/CheckTaskButton";

const FREQUENCY_LABEL: Record<number, string> = {
  7: "ugentligt",
  14: "hver 2. uge",
};

function fmtShort(date: string) {
  return new Date(date).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export type SeriesInfo = {
  id: string;
  title: string;
  frequency_days: number;
  start_date: string;
  end_date: string;
};

export default function SeriesTaskGroup({
  series,
  allTasks,
  pendingTasks,
}: {
  series: SeriesInfo;
  allTasks: SeriesTaskRow[];
  pendingTasks: (SeriesTaskRow & { title: string; due_date: string | null; task_type: string | null })[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const summary = summarizeSeries(allTasks);

  async function handleEnd() {
    setEnding(true);
    await endTaskSeries(supabase, series.id);
    setEnding(false);
    setEnded(true);
    router.refresh();
  }

  if (ended) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <Repeat size={13} className="text-earth-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-earth-100">{series.title}</p>
          <p className="text-[11px] text-earth-500 mt-0.5">
            {FREQUENCY_LABEL[series.frequency_days] ?? `hver ${series.frequency_days}. dag`}
            {" · "}{fmtShort(series.start_date)}–{fmtShort(series.end_date)}
            {" · "}{summary.pending} tilbage af {summary.totalOccurrences}
            {summary.totalEstimatedMinutes > 0 && (
              <> · ~{Math.round(summary.totalEstimatedMinutes / 60 * 10) / 10}t total</>
            )}
            {summary.totalActualMinutes > 0 && (
              <> · {summary.totalActualMinutes} min logget</>
            )}
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-earth-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-earth-500 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 pt-1">
          {pendingTasks.length === 0 ? (
            <p className="text-[11px] text-earth-600">Ingen ventende forekomster</p>
          ) : (
            pendingTasks.map((t) => (
              <div key={t.id} className="flex items-start gap-2.5">
                <CheckTaskButton taskId={t.id} taskType={t.task_type} estimatedMinutes={t.estimated_minutes} />
                <p className="text-xs text-earth-300 flex-1">
                  {t.due_date ? fmtShort(t.due_date) : "Ingen dato"}
                  {t.estimated_minutes ? ` · ~${t.estimated_minutes} min` : ""}
                </p>
              </div>
            ))
          )}
          {summary.pending > 0 && (
            <button
              type="button"
              onClick={handleEnd}
              disabled={ending}
              className="text-[11px] font-medium"
              style={{ color: "#f87171" }}
            >
              {ending ? "Afslutter…" : `Afslut serie (dropper ${summary.pending} resterende)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
