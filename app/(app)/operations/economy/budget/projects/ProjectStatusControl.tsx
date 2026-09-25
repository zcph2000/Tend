"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const STATUSES = [
  { v: "planlagt", l: "Planlagt" },
  { v: "i gang", l: "I gang" },
  { v: "afsluttet", l: "Afsluttet" },
  { v: "skrottet", l: "Skrottet" },
] as const;

export default function ProjectStatusControl({ projectId, status }: { projectId: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleChange(v: string) {
    setCurrent(v);
    setSaving(true);
    await supabase.from("budget_projects").update({ status: v }).eq("id", projectId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {STATUSES.map((s) => (
        <button
          key={s.v}
          type="button"
          disabled={saving}
          onClick={() => handleChange(s.v)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: current === s.v ? "rgba(163,230,53,0.15)" : "var(--surface-raised)",
            color: current === s.v ? "#a3e635" : "var(--text-muted)",
          }}
        >
          {s.l}
        </button>
      ))}
    </div>
  );
}
