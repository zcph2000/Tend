"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CheckTaskButton({
  taskId,
  taskType,
  estimatedMinutes,
}: {
  taskId: string;
  taskType?: string | null;
  estimatedMinutes?: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [askMinutes, setAskMinutes] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [minutesSaved, setMinutesSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCheck() {
    setLoading(true);
    setDone(true);
    await supabase
      .from("farm_tasks")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("id", taskId);
    setLoading(false);
    // Opgavelisten filtrerer på status='pending', så et router.refresh() her
    // ville fjerne rækken fra siden med det samme og lukke tidsspørgsmålet
    // før brugeren kan nå at svare — refresh sker derfor først når
    // tidsspørgsmålet er besvaret eller sprunget over (se saveMinutes).
    if (taskType) setAskMinutes(true);
    else router.refresh();
  }

  async function saveMinutes() {
    const value = Number(minutes);
    if (minutes && Number.isFinite(value) && value > 0) {
      await supabase.from("farm_tasks").update({ actual_minutes: value }).eq("id", taskId);
      setMinutesSaved(true);
    }
    setAskMinutes(false);
    router.refresh();
  }

  if (askMinutes) {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="number"
          min="1"
          autoFocus
          className="input py-1 px-1.5 text-xs"
          style={{ width: "3.5rem" }}
          placeholder={estimatedMinutes ? String(estimatedMinutes) : "min"}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveMinutes()}
        />
        <button type="button" onClick={saveMinutes} className="text-[10px] font-semibold" style={{ color: "#a3e635" }}>
          Gem
        </button>
        <button type="button" onClick={() => { setAskMinutes(false); router.refresh(); }} className="text-[10px] text-earth-500">
          Spring over
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCheck}
      disabled={loading || done}
      title={minutesSaved ? `${minutes} min registreret` : "Markér som udført"}
      className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
      style={{
        borderColor: done ? "var(--grass, #4ade80)" : "rgba(255,255,255,0.2)",
        background: done ? "rgba(74,222,128,0.15)" : "transparent",
      }}
    >
      {done && <Check size={11} className="text-grass-400" style={{ color: "#4ade80" }} />}
    </button>
  );
}
