"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet */ }
}

const CATEGORIES = [
  { v: "jordbrug", l: "Jordbrug" },
  { v: "dyr",      l: "Dyr" },
  { v: "admin",    l: "Admin" },
  { v: "økonomi",  l: "Økonomi" },
  { v: "andet",    l: "Andet" },
] as const;

export default function AddTaskForm({
  farmId,
  defaultDate,
}: {
  farmId: string;
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [category, setCategory] = useState<string>("jordbrug");
  const [timingType, setTimingType] = useState<"exact" | "week">("exact");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from("farm_tasks").insert({
      farm_id: farmId,
      title: title.trim(),
      due_date: dueDate || null,
      category,
      timing_type: timingType,
      source_type: "manual",
    });
    setSaving(false);
    setTitle("");
    setDueDate(defaultDate);
    setCategory("jordbrug");
    setOpen(false);
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
        Tilføj opgave
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
        placeholder="Hvad skal gøres?"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Dato</label>
          <input
            type="date"
            className="input w-full mt-0.5 text-xs cursor-pointer"
            value={dueDate}
            onClick={openPicker}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-[10px]">Kategori</label>
          <select className="input w-full mt-0.5 text-xs" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.v} value={c.v}>{c.l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(["exact", "week"] as const).map(t => (
          <button
            key={t} type="button"
            onClick={() => setTimingType(t)}
            className="px-2.5 py-1 rounded-lg text-xs transition-colors"
            style={{
              background: timingType === t ? "var(--clay, #c4622a)" : "var(--surface, #2a2418)",
              color: timingType === t ? "#fff" : "var(--text-muted, #a8a29e)",
            }}
          >
            {t === "exact" ? "Eksakt dato" : "I løbet af ugen"}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40"
      >
        {saving ? "Gemmer…" : "Tilføj"}
      </button>
    </form>
  );
}
