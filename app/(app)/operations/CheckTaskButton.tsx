"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CheckTaskButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleCheck() {
    setLoading(true);
    setDone(true);
    await supabase
      .from("farm_tasks")
      .update({ status: "done", done_at: new Date().toISOString() })
      .eq("id", taskId);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleCheck}
      disabled={loading || done}
      title="Markér som udført"
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
