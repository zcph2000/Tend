"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapSectionEditor = dynamic(() => import("@/components/MapSectionEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] bg-earth-100 rounded-xl flex items-center justify-center">
      <p className="text-earth-400 text-sm">Kortet indlæses...</p>
    </div>
  ),
});

interface DrawnSection {
  geojson: { type: string; coordinates: number[][][] };
  area_ha: number;
}

interface ExistingSection {
  geojson?: { type: string; coordinates: number[][][] } | null;
  name: string;
}

export default function AddSectionForm({
  fieldId,
  farmId,
  fieldArea,
  fieldName,
  fieldGeojson,
  existingSections = [],
  mapboxToken,
  farmLat,
  farmLng,
}: {
  fieldId: string;
  farmId: string;
  fieldArea: number;
  fieldName: string;
  fieldGeojson?: { type: string; coordinates: number[][][] } | null;
  existingSections?: ExistingSection[];
  mapboxToken?: string;
  farmLat?: number | null;
  farmLng?: number | null;
}) {
  const nextNumber = existingSections.length + 1;
  const suggestedName = `${fieldName} — Sektion ${nextNumber}`;

  const [open, setOpen] = useState(false);
  const [useMap, setUseMap] = useState(!!mapboxToken);
  const [name, setName] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [drawnSection, setDrawnSection] = useState<DrawnSection | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSectionDrawn = useCallback((section: DrawnSection) => {
    setDrawnSection(section);
    setAreaHa(section.area_ha.toFixed(2));
  }, []);

  async function handleSave() {
    if (!name || !areaHa) return;
    setLoading(true);

    await supabase.from("sections").insert({
      field_id: fieldId,
      farm_id: farmId,
      name: name || suggestedName,
      area_ha: parseFloat(areaHa),
      geojson: drawnSection?.geojson ?? null,
      purpose: purpose || null,
      notes: notes || null,
    });

    setLoading(false);
    setOpen(false);
    setName("");
    setAreaHa("");
    setPurpose("");
    setNotes("");
    setDrawnSection(null);
    router.refresh();
  }

  const initialCenter: [number, number] = farmLng && farmLat
    ? [farmLng, farmLat]
    : [11.0, 55.75];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Tilføj sektion
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-earth-900">Ny sektion</h3>
        {mapboxToken && (
          <button
            type="button"
            onClick={() => { setUseMap(!useMap); setDrawnSection(null); setAreaHa(""); }}
            className="text-xs text-grass-600 font-medium"
          >
            {useMap ? "Manuel indtastning" : "Tegn på kort"}
          </button>
        )}
      </div>

      <div>
        <label className="label">Navn på sektion *</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggestedName}
        />
        {!name && (
          <button
            type="button"
            onClick={() => setName(suggestedName)}
            className="text-xs text-grass-600 font-medium mt-1"
          >
            Brug forslag: "{suggestedName}"
          </button>
        )}
      </div>

      {/* Kort eller manuel */}
      {mapboxToken && useMap ? (
        <div className="space-y-2">
          <label className="label mb-0">Tegn sektionen på kortet</label>
          <p className="text-xs text-earth-500 -mt-1">
            Markgrænsen vises med grøn stiplet linje som reference
          </p>
          <MapSectionEditor
            onSectionDrawn={handleSectionDrawn}
            mapboxToken={mapboxToken}
            fieldGeojson={fieldGeojson}
            existingSections={existingSections}
            initialCenter={initialCenter}
          />
          {drawnSection && (
            <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-2">
              <span className="text-sm text-amber-700">Beregnet areal</span>
              <span className="font-bold text-amber-800">{areaHa} ha</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="label">Areal (ha)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={areaHa}
            onChange={(e) => setAreaHa(e.target.value)}
            placeholder={`Max ${fieldArea} ha`}
          />
        </div>
      )}

      <div>
        <label className="label">Formål</label>
        <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="">— Ikke angivet —</option>
          <option value="naturpleje">Naturpleje (EU-aftale, begrænset indgreb)</option>
          <option value="produktion">Produktionsmark</option>
          <option value="opfedning">Opfedningsmark</option>
          <option value="høst">Reserveret til høst</option>
          <option value="hvilende">Hvilende / genopretning</option>
        </select>
      </div>

      <div>
        <label className="label">Noter til rådgiver (valgfri)</label>
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Fx: kløver sået marts 2025, dræningsproblemer i nordøst..."
        />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">
          Annuller
        </button>
        <button
          onClick={handleSave}
          disabled={!areaHa || loading}
          className="btn-primary flex-1"
        >
          {loading ? "Gemmer..." : "Gem sektion"}
        </button>
      </div>
    </div>
  );
}
