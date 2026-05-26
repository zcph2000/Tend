"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Method = "direkte_sået" | "udplantet_eget" | "udplantet_købt";

export type PlantingForEdit = {
  id: string;
  crop_name: string;
  variety: string | null;
  method: string | null;
  status: string;
  sowed_at: string | null;
  transplanted_at: string | null;
  plant_age_weeks_at_transplant: number | null;
  expected_harvest_at: string | null;
  quantity_plants: number | null;
  row_spacing_cm: number | null;
  plant_spacing_cm: number | null;
  bed_offset_m: number | null;
  zone_length_m: number | null;
  notes: string | null;
};

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ikke understøttet i ældre browsere */ }
}

const METHOD_OPTS: { v: Method; l: string }[] = [
  { v: "direkte_sået", l: "Direkte sået" },
  { v: "udplantet_eget", l: "Udplantet — eget" },
  { v: "udplantet_købt", l: "Udplantet — købt" },
];

export default function EditPlantingForm({
  planting,
  bedLengthM,
  onClose,
}: {
  planting: PlantingForEdit;
  bedLengthM: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [method, setMethod] = useState<Method>((planting.method as Method) ?? "udplantet_eget");
  const [sowDate, setSowDate] = useState(planting.sowed_at ?? "");
  const [transplantDate, setTransplantDate] = useState(planting.transplanted_at ?? "");
  const [plantAgeWeeks, setPlantAgeWeeks] = useState(
    planting.plant_age_weeks_at_transplant ? String(planting.plant_age_weeks_at_transplant) : ""
  );
  const [expectedHarvest, setExpectedHarvest] = useState(planting.expected_harvest_at ?? "");
  const [status, setStatus] = useState(planting.status);
  const [rowSpacing, setRowSpacing] = useState(planting.row_spacing_cm ? String(planting.row_spacing_cm) : "");
  const [plantSpacing, setPlantSpacing] = useState(planting.plant_spacing_cm ? String(planting.plant_spacing_cm) : "");
  const [offsetM, setOffsetM] = useState(planting.bed_offset_m ?? 0);
  const [zoneLengthM, setZoneLengthM] = useState(planting.zone_length_m ?? bedLengthM);
  const [notes, setNotes] = useState(planting.notes ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("bed_plantings").update({
      method,
      sowed_at: sowDate || null,
      transplanted_at: transplantDate || null,
      plant_age_weeks_at_transplant: plantAgeWeeks ? Number(plantAgeWeeks) : null,
      expected_harvest_at: expectedHarvest || null,
      status,
      row_spacing_cm: rowSpacing ? Number(rowSpacing) : null,
      plant_spacing_cm: plantSpacing ? Number(plantSpacing) : null,
      bed_offset_m: offsetM,
      zone_length_m: Math.min(zoneLengthM, bedLengthM),
      notes: notes || null,
    }).eq("id", planting.id);
    setSaving(false);
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await supabase.from("bed_plantings").delete().eq("id", planting.id);
    setDeleting(false);
    onClose();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-xl p-3 space-y-3 mt-2"
      style={{ background: "var(--surface-raised)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-earth-300">
          Rediger: {planting.crop_name}{planting.variety ? ` · ${planting.variety}` : ""}
        </p>
        <button type="button" onClick={onClose}>
          <ChevronUp size={14} className="text-earth-500" />
        </button>
      </div>

      {/* Status */}
      <div>
        <label className="label text-[10px]">Status</label>
        <select className="input w-full mt-0.5 text-xs" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="planlagt">Planlagt</option>
          <option value="spiret">Spiret</option>
          <option value="plantet">Plantet ud</option>
          <option value="høstet">Høstet</option>
          <option value="fjernet">Fjernet</option>
        </select>
      </div>

      {/* Metode */}
      <div>
        <label className="label text-[10px]">Metode</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {METHOD_OPTS.map(m => (
            <button
              key={m.v} type="button"
              onClick={() => setMethod(m.v)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: method === m.v ? "var(--clay)" : "var(--surface)",
                color: method === m.v ? "#fff" : "var(--text-muted)",
              }}
            >
              {m.l}
            </button>
          ))}
        </div>
      </div>

      {/* Datoer */}
      <div className={`grid gap-3 ${method !== "direkte_sået" ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="label text-[10px]">{method === "direkte_sået" ? "Sådato" : "Sået (valgfrit)"}</label>
          <input
            type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
            onClick={openPicker}
            value={sowDate} onChange={e => setSowDate(e.target.value)}
          />
        </div>
        {method !== "direkte_sået" && (
          <div>
            <label className="label text-[10px]">Udplantet</label>
            <input
              type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
              onClick={openPicker}
              value={transplantDate} onChange={e => setTransplantDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {method !== "direkte_sået" && (
        <div>
          <label className="label text-[10px]">Alder ved udplantning (uger)</label>
          <input
            type="number" min="1" max="52"
            className="input w-24 mt-0.5 text-xs"
            value={plantAgeWeeks}
            onChange={e => setPlantAgeWeeks(e.target.value)}
            placeholder="8"
          />
        </div>
      )}

      {/* Forventet høst */}
      <div>
        <label className="label text-[10px]">Forventet høst</label>
        <input
          type="date" className="input w-full mt-0.5 text-xs cursor-pointer"
          onClick={openPicker}
          value={expectedHarvest} onChange={e => setExpectedHarvest(e.target.value)}
        />
      </div>

      {/* Afstand */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-[10px]">Rækkeafstand (cm)</label>
          <input
            type="number" step="5" min="5"
            className="input w-full mt-0.5 text-xs"
            value={rowSpacing} onChange={e => setRowSpacing(e.target.value)}
            placeholder="60"
          />
        </div>
        <div>
          <label className="label text-[10px]">Planteafstand (cm)</label>
          <input
            type="number" step="5" min="5"
            className="input w-full mt-0.5 text-xs"
            value={plantSpacing} onChange={e => setPlantSpacing(e.target.value)}
            placeholder="30"
          />
        </div>
      </div>

      {/* Zone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-[10px]">Fra (m fra ende)</label>
          <input
            type="number" step="0.5" min="0" max={bedLengthM}
            className="input w-full mt-0.5 text-xs"
            value={offsetM} onChange={e => setOffsetM(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label text-[10px]">Zonelængde (m)</label>
          <input
            type="number" step="0.5" min="0.5" max={bedLengthM}
            className="input w-full mt-0.5 text-xs"
            value={zoneLengthM} onChange={e => setZoneLengthM(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Noter */}
      <div>
        <label className="label text-[10px]">Noter</label>
        <textarea
          rows={2} className="input w-full mt-0.5 text-xs resize-none"
          value={notes} onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm py-2 disabled:opacity-40">
          {saving ? "Gemmer…" : "Gem ændringer"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: confirmDelete ? "rgba(239,68,68,0.2)" : "var(--surface)",
            color: confirmDelete ? "#f87171" : "var(--text-muted)",
          }}
        >
          {deleting ? "…" : confirmDelete ? "Bekræft slet" : "Fjern"}
        </button>
      </div>
      {confirmDelete && (
        <button type="button" onClick={() => setConfirmDelete(false)} className="text-[11px] text-earth-500">
          Annuller sletning
        </button>
      )}
    </form>
  );
}
