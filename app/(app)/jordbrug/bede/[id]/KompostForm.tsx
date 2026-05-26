"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet i ældre browsere */ }
}

export default function KompostForm({ bedId, farmId }: { bedId: string; farmId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!farmId) return;
    setSaving(true);
    await supabase.from("bed_compost_applications").insert({
      farm_id: farmId,
      bed_id: bedId,
      applied_date: date,
      amount_description: amount || null,
      source: source || null,
    });
    setSaving(false);
    setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-t border-white/5 pt-3">
      <p className="text-xs text-earth-400 font-medium">Registrér kompost</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Dato</label>
          <input
            type="date"
            className="input w-full mt-0.5 text-xs cursor-pointer"
            value={date}
            onClick={openPicker}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-[10px]">Kilde</label>
          <select
            className="input w-full mt-0.5 text-xs"
            value={source}
            onChange={e => setSource(e.target.value)}
          >
            <option value="">Vælg…</option>
            <option value="Havekompost">Havekompost</option>
            <option value="Kogødning">Kogødning</option>
            <option value="Hestemøg">Hestemøg</option>
            <option value="Fåremøg">Fåremøg</option>
            <option value="Ormekompost">Ormekompost</option>
            <option value="Andet">Andet</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label text-[10px]">Mængde</label>
        <input
          className="input w-full mt-0.5 text-xs"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="fx Fuld dækning 5 cm, 10 kg"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
        style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}
      >
        {saving ? "Gemmer…" : "Tilføj kompost"}
      </button>
    </form>
  );
}
