"use client";

import { useState, useMemo } from "react";
import { Pencil, CalendarDays } from "lucide-react";
import { YIELD_KG_PER_PLANT } from "@/lib/companionPlants";
import EditPlantingForm, { type PlantingForEdit } from "./EditPlantingForm";

const FAMILY_COLORS: Record<string, string> = {
  "Natskyggefamilien":  "rgba(239,68,68,0.15)",
  "Korsblomstfamilien": "rgba(251,191,36,0.15)",
  "Skærmblomstfamilien":"rgba(34,197,94,0.12)",
  "Ærtefamilien":       "rgba(56,189,248,0.15)",
  "Græskarfamilien":    "rgba(249,115,22,0.15)",
  "Rosenfamilien":      "rgba(236,72,153,0.12)",
  "Amarantfamilien":    "rgba(168,85,247,0.12)",
  "Løgfamilien":        "rgba(234,179,8,0.15)",
  "Kurvblomstfamilien": "rgba(16,185,129,0.12)",
};

const METHOD_LABEL: Record<string, string> = {
  direkte_sået: "Direkte sået",
  udplantet_eget: "Udplantet (eget forspiring)",
  udplantet_købt: "Udplantet (købt plante)",
};

function fmt(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export type PlantingCardData = PlantingForEdit & {
  zone_description: string | null;
  harvested_at: string | null;
  season: number | null;
  crop_varieties: {
    name: string;
    crop_species: {
      name_da: string;
      crop_families: { name_da: string } | null;
    } | null;
  } | null;
};

function PlantingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    planlagt:  { label: "Planlagt",    color: "var(--text-muted)",  bg: "var(--surface-raised)" },
    spiret:    { label: "Spiret",      color: "#a3e635",            bg: "rgba(163,230,53,0.1)" },
    plantet:   { label: "Plantet ud",  color: "var(--grass)",       bg: "rgba(34,197,94,0.1)" },
    høstet:    { label: "Høstet",      color: "var(--text-subtle)", bg: "var(--surface-raised)" },
    fjernet:   { label: "Fjernet",     color: "var(--text-subtle)", bg: "var(--surface-raised)" },
  };
  const s = map[status] ?? map.planlagt;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function PlantingCard({
  planting,
  bedLengthM,
}: {
  planting: PlantingCardData;
  bedLengthM: number;
}) {
  const [editing, setEditing] = useState(false);

  const cv = planting.crop_varieties;
  const species = cv?.crop_species?.name_da;
  const family = cv?.crop_species?.crop_families?.name_da ?? null;

  // Udbytte-estimat fra lagret antal og plantefamilie
  const yieldKg = useMemo(() => {
    if (!planting.quantity_plants || !family) return null;
    const kgPerPlant = YIELD_KG_PER_PLANT[family];
    if (!kgPerPlant) return null;
    return Math.round(planting.quantity_plants * kgPerPlant * 10) / 10;
  }, [planting.quantity_plants, family]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Hoved-række */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-earth-100 text-sm leading-snug">
              {planting.crop_name}
              {planting.variety && <span className="text-earth-400 font-normal"> · {planting.variety}</span>}
            </p>
            {species && species !== planting.crop_name && (
              <p className="text-[11px] text-earth-500 mt-0.5">{species}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditing(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:brightness-110"
              style={{
                background: editing ? "var(--clay)" : "var(--surface-raised)",
                color: editing ? "#fff" : "var(--text-muted)",
              }}
            >
              <Pencil size={11} />
              {editing ? "Luk" : "Rediger"}
            </button>
            <div className="flex flex-col items-end gap-1">
              <PlantingStatusBadge status={planting.status} />
              {family && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: FAMILY_COLORS[family] ?? "var(--surface-raised)", color: "var(--text-muted)" }}
                >
                  {family}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata-linje */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-earth-500">
          {planting.method && <span>{METHOD_LABEL[planting.method] ?? planting.method}</span>}
          {planting.sowed_at && <span>Sået {fmt(planting.sowed_at)}</span>}
          {planting.transplanted_at && <span>Udplantet {fmt(planting.transplanted_at)}</span>}
          {planting.plant_age_weeks_at_transplant && (
            <span>{planting.plant_age_weeks_at_transplant} uger gammel ved udplantning</span>
          )}
          {planting.quantity_plants && <span>{planting.quantity_plants} planter</span>}
        </div>

        {/* Afstandsinfo */}
        {(planting.row_spacing_cm || planting.plant_spacing_cm) && (
          <div className="flex gap-1.5 flex-wrap">
            {planting.row_spacing_cm && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "var(--surface-raised)", color: "var(--text-subtle)" }}
              >
                Rækker: {planting.row_spacing_cm} cm
              </span>
            )}
            {planting.plant_spacing_cm && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "var(--surface-raised)", color: "var(--text-subtle)" }}
              >
                Planter: {planting.plant_spacing_cm} cm
              </span>
            )}
          </div>
        )}

        {planting.notes && <p className="text-[11px] text-earth-500 italic">{planting.notes}</p>}
      </div>

      {/* Høst + udbytte — fremtrædende blok i bunden */}
      {planting.expected_harvest_at && (
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(163,230,53,0.06)", borderTop: "1px solid rgba(163,230,53,0.12)" }}
        >
          <CalendarDays size={14} style={{ color: "#a3e635", flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-earth-500">Estimeret høst</p>
            <p className="text-sm font-semibold" style={{ color: "#a3e635" }}>
              {fmt(planting.expected_harvest_at)}
            </p>
          </div>
          {yieldKg !== null && (
            <div className="text-right flex-shrink-0">
              <p className="text-[11px] text-earth-500">Est. udbytte</p>
              <p className="text-sm font-semibold text-earth-200">
                ca. {yieldKg}–{Math.round(yieldKg * 1.5 * 10) / 10} kg
              </p>
            </div>
          )}
        </div>
      )}

      {/* Inline redigeringsformular */}
      {editing && (
        <div className="px-4 pb-4">
          <EditPlantingForm
            planting={planting}
            bedLengthM={bedLengthM}
            onClose={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}
