"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";

export default function ProjectLineForm({
  farmId,
  projectId,
}: {
  farmId: string;
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("redskaber");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    if (!amount) return;
    setSaving(true);
    await supabase.from("budget_lines").insert({
      farm_id: farmId,
      project_id: projectId,
      source: "udgift",
      category,
      description: description || null,
      estimated_amount_dkk: -Number(amount),
    });
    setSaving(false);
    setDescription(""); setAmount("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
        <Plus size={13} />
        Tilføj budgetlinje
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">Ny budgetlinje</p>
        <button type="button" onClick={() => setOpen(false)}><X size={14} className="text-earth-500" /></button>
      </div>

      <div>
        <label className="label text-[10px]">Kategori</label>
        <select className="input w-full mt-0.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.filter((c) => c.v !== "tilskud").map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
      </div>

      <div>
        <label className="label text-[10px]">Beskrivelse (valgfrit)</label>
        <input className="input w-full mt-0.5 text-sm" placeholder="fx Byggematerialer"
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="label text-[10px]">Skønnet beløb (kr)</label>
        <input type="number" step="1" min="0" className="input w-full mt-0.5 text-sm" placeholder="0"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>

      <button type="button" onClick={handleSave} disabled={saving || !amount}
        className="w-full btn-primary text-sm py-2 disabled:opacity-40">
        {saving ? "Gemmer…" : "Tilføj linje"}
      </button>
    </div>
  );
}
