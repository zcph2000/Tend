"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SOIL_TYPES = [
  { key: "sand",   label: "Sandet",  desc: "Hurtig dræning, lang hvileperiode" },
  { key: "normal", label: "Normal",  desc: "Standardjord, balanceret vækst" },
  { key: "clay",   label: "Ler",     desc: "God vandretention, kortere hvile" },
  { key: "humus",  label: "Humus",   desc: "Høj biologisk aktivitet, kort hvile" },
];

export default function EditSoilTypeForm({
  fieldId,
  currentSoilType,
}: {
  fieldId: string;
  currentSoilType: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentSoilType ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function save() {
    setSaving(true);
    await supabase
      .from("fields")
      .update({ soil_type: selected || null })
      .eq("id", fieldId);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  const current = SOIL_TYPES.find(s => s.key === currentSoilType);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-xl px-3 py-2.5 border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-between"
      >
        <span className="text-sm text-earth-300">
          {current ? (
            <>
              <span className="font-medium text-earth-100">{current.label}jord</span>
              <span className="ml-2 text-earth-400 text-xs">{current.desc}</span>
            </>
          ) : (
            <span className="text-earth-400">Ingen jordtype valgt — tryk for at sætte</span>
          )}
        </span>
        <span className="text-earth-500 text-xs">Rediger</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {SOIL_TYPES.map(s => (
        <button
          key={s.key}
          onClick={() => setSelected(s.key)}
          className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
            selected === s.key
              ? "border-earth-300 bg-white/5"
              : "border-white/10 hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === s.key ? "border-earth-300" : "border-earth-600"
            }`}>
              {selected === s.key && (
                <span className="w-2 h-2 rounded-full bg-earth-300 block" />
              )}
            </span>
            <div>
              <p className="text-sm font-medium text-earth-100">{s.label}jord</p>
              <p className="text-xs text-earth-400">{s.desc}</p>
            </div>
          </div>
        </button>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={save} disabled={saving} className="btn-primary flex-1">
          {saving ? "Gemmer..." : "Gem"}
        </button>
      </div>
    </div>
  );
}
