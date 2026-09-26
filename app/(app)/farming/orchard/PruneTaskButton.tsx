"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PruneTaskButton({
  farmId,
  fruitPlantId,
  title,
  dueDate,
  dueDateEnd,
}: {
  farmId: string;
  fruitPlantId: string;
  title: string;
  dueDate: string;
  dueDateEnd: string;
}) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate() {
    setSaving(true);
    await supabase.from("farm_tasks").insert({
      farm_id: farmId,
      title,
      due_date: dueDate,
      due_date_end: dueDateEnd !== dueDate ? dueDateEnd : null,
      category: "jordbrug",
      timing_type: "exact",
      source_type: "manual",
      task_type: "beskæring",
      fruit_plant_id: fruitPlantId,
    });
    setSaving(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#a3e635" }}>
        <CheckCircle size={14} /> Lagt i kalenderen
      </div>
    );
  }

  return (
    <button type="button" onClick={handleCreate} disabled={saving} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40">
      {saving ? "Opretter…" : "Opret opgave"}
    </button>
  );
}
