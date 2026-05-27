"use client";

import { useState } from "react";
import { Plus, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AddPolytunnelPlantingForm({ polytunnelId, farmId }: { polytunnelId: string; farmId: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    crop_name: "", variety: "", sowed_at: "", transplanted_at: "",
    expected_harvest_at: "", quantity_plants: "", status: "planlagt", notes: "",
  });
  const router = useRouter();
  const supabase = createClient();

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.crop_name.trim()) return;
    setSaving(true);
    await supabase.from("polytunnel_plantings").insert({
      polytunnel_id: polytunnelId,
      farm_id: farmId,
      crop_name: form.crop_name.trim(),
      variety: form.variety || null,
      sowed_at: form.sowed_at || null,
      transplanted_at: form.transplanted_at || null,
      expected_harvest_at: form.expected_harvest_at || null,
      quantity_plants: form.quantity_plants ? Number(form.quantity_plants) : null,
      status: form.status,
      notes: form.notes || null,
    });
    setSaving(false);
    setOpen(false);
    setForm({ crop_name: "", variety: "", sowed_at: "", transplanted_at: "", expected_harvest_at: "", quantity_plants: "", status: "planlagt", notes: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-earth-700 rounded-xl py-3 text-sm text-earth-400 hover:border-earth-500 hover:text-earth-300 transition-colors">
        <Plus size={16} /> Tilføj planting
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-earth-100 text-sm">Ny planting</h3>
        <button type="button" onClick={() => setOpen(false)}><ChevronUp size={16} className="text-earth-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Afgrøde *</label>
          <input className="input w-full mt-1" value={form.crop_name} onChange={(e) => set("crop_name", e.target.value)} placeholder="Tomat..." required />
        </div>
        <div>
          <label className="label">Sort</label>
          <input className="input w-full mt-1" value={form.variety} onChange={(e) => set("variety", e.target.value)} placeholder="Cherry..." />
        </div>
      </div>
      <div>
        <label className="label">Status</label>
        <select className="input w-full mt-1" value={form.status} onChange={(e) => set("status", e.target.value)}>
          <option value="planlagt">Planlagt</option>
          <option value="spiret">Spiret</option>
          <option value="plantet">Plantet ud</option>
          <option value="høstet">Høstet</option>
          <option value="fjernet">Fjernet</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label text-[10px]">Sået</label><input type="date" className="input w-full mt-1 text-xs" value={form.sowed_at} onChange={(e) => set("sowed_at", e.target.value)} /></div>
        <div><label className="label text-[10px]">Plantet ud</label><input type="date" className="input w-full mt-1 text-xs" value={form.transplanted_at} onChange={(e) => set("transplanted_at", e.target.value)} /></div>
        <div><label className="label text-[10px]">Forv. høst</label><input type="date" className="input w-full mt-1 text-xs" value={form.expected_harvest_at} onChange={(e) => set("expected_harvest_at", e.target.value)} /></div>
      </div>
      <div>
        <label className="label">Antal planter</label>
        <input type="number" min="1" className="input w-full mt-1" value={form.quantity_plants} onChange={(e) => set("quantity_plants", e.target.value)} placeholder="20" />
      </div>
      <div>
        <label className="label">Noter</label>
        <textarea rows={2} className="input w-full mt-1 resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="..." />
      </div>
      <button type="submit" disabled={saving || !form.crop_name.trim()} className="btn-primary w-full disabled:opacity-40">
        {saving ? "Gemmer..." : "Tilføj planting"}
      </button>
    </form>
  );
}
