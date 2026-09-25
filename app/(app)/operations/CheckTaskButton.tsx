"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const DATE_FIELD: Record<string, "sowed_at" | "transplanted_at"> = {
  såning: "sowed_at",
  udplantning: "transplanted_at",
};

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CheckTaskButton({
  taskId,
  taskType,
  estimatedMinutes,
  estimatedCostDkk,
  bedPlantingId,
  dueDate,
}: {
  taskId: string;
  taskType?: string | null;
  estimatedMinutes?: number | null;
  estimatedCostDkk?: number | null;
  bedPlantingId?: string | null;
  dueDate?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<"idle" | "minutes" | "cost" | "dateAndMinutes">("idle");
  const [minutes, setMinutes] = useState("");
  const [cost, setCost] = useState("");
  const [actualDate, setActualDate] = useState(() => dueDate ?? todayISO());
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const dateField = taskType ? DATE_FIELD[taskType] : undefined;

  async function handleCheck() {
    setLoading(true);
    setDone(true);
    await supabase
      .from("farm_tasks")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("id", taskId);
    setLoading(false);
    // Opgavelisten filtrerer på status='pending', så et router.refresh() her
    // ville fjerne rækken fra siden med det samme og lukke opfølgningsspørgsmålet
    // før brugeren kan nå at svare — refresh sker derfor først når det er
    // besvaret eller sprunget over (se save-funktionerne nedenfor).
    if (taskType === "indkøb") setMode("cost");
    else if (dateField && bedPlantingId) setMode("dateAndMinutes");
    else if (taskType) setMode("minutes");
    else router.refresh();
  }

  async function saveMinutes() {
    const value = Number(minutes);
    if (minutes && Number.isFinite(value) && value > 0) {
      await supabase.from("farm_tasks").update({ actual_minutes: value }).eq("id", taskId);
      setSavedNote(`${minutes} min registreret`);
    }
    setMode("idle");
    router.refresh();
  }

  async function saveCost() {
    const value = Number(cost);
    if (cost && Number.isFinite(value) && value >= 0) {
      await supabase.from("farm_tasks").update({ actual_cost_dkk: value }).eq("id", taskId);
      setSavedNote(`${cost} kr registreret`);
    }
    setMode("idle");
    router.refresh();
  }

  async function saveDateAndMinutes() {
    if (dateField && bedPlantingId && actualDate) {
      await supabase.from("bed_plantings").update({ [dateField]: actualDate }).eq("id", bedPlantingId);
    }
    const value = Number(minutes);
    if (minutes && Number.isFinite(value) && value > 0) {
      await supabase.from("farm_tasks").update({ actual_minutes: value }).eq("id", taskId);
    }
    setMode("idle");
    router.refresh();
  }

  function skip() {
    setMode("idle");
    router.refresh();
  }

  if (mode === "cost") {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="number"
          min="0"
          step="0.1"
          autoFocus
          className="input py-1 px-1.5 text-xs"
          style={{ width: "4.5rem" }}
          placeholder={estimatedCostDkk ? String(estimatedCostDkk) : "kr"}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveCost()}
        />
        <button type="button" onClick={saveCost} className="text-[10px] font-semibold" style={{ color: "#a3e635" }}>
          Gem
        </button>
        <button type="button" onClick={skip} className="text-[10px] text-earth-500">
          Spring over
        </button>
      </div>
    );
  }

  if (mode === "dateAndMinutes") {
    return (
      <div className="flex flex-col gap-1 flex-shrink-0 py-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-earth-500 w-16 flex-shrink-0">Faktisk dato</span>
          <input
            type="date"
            className="input py-1 px-1.5 text-xs cursor-pointer"
            value={actualDate}
            onClick={openPicker}
            onChange={(e) => setActualDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-earth-500 w-16 flex-shrink-0">Brugt tid</span>
          <input
            type="number"
            min="1"
            className="input py-1 px-1.5 text-xs"
            style={{ width: "3.5rem" }}
            placeholder={estimatedMinutes ? String(estimatedMinutes) : "min"}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveDateAndMinutes()}
          />
          <button type="button" onClick={saveDateAndMinutes} className="text-[10px] font-semibold" style={{ color: "#a3e635" }}>
            Gem
          </button>
          <button type="button" onClick={skip} className="text-[10px] text-earth-500">
            Spring over
          </button>
        </div>
      </div>
    );
  }

  if (mode === "minutes") {
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
        <button type="button" onClick={skip} className="text-[10px] text-earth-500">
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
      title={savedNote ?? "Markér som udført"}
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
