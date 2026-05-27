"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchFieldGeoData } from "@/lib/geodata";
import { Globe, Leaf, Check } from "lucide-react";

const MapFieldEditor = dynamic(() => import("@/components/MapFieldEditor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] bg-earth-100 rounded-xl flex items-center justify-center">
      <p className="text-earth-200 text-sm">Kortet indlæses...</p>
    </div>
  ),
});

interface DrawnField {
  geojson: { type: string; coordinates: number[][][] };
  area_ha: number;
  centroid: [number, number];
}

export default function AddFieldForm({
  farmId,
  mapboxToken,
  farmLat,
  farmLng,
}: {
  farmId: string;
  mapboxToken?: string;
  farmLat?: number | null;
  farmLng?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [useMap, setUseMap] = useState(!!mapboxToken);
  const [name, setName] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [sectionCount, setSectionCount] = useState("");
  const [notes, setNotes] = useState("");
  const [natureAgreement, setNatureAgreement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawnField, setDrawnField] = useState<DrawnField | null>(null);
  const [geoDataLoading, setGeoDataLoading] = useState(false);
  const [geoData, setGeoData] = useState<{
    soil?: { texture: string; ph: number | null; organic_carbon: number | null };
    elevation?: { elevation_m: number };
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFieldDrawn = useCallback(async (field: DrawnField) => {
    setDrawnField(field);
    setAreaHa(field.area_ha.toFixed(2));
    setGeoDataLoading(true);
    try {
      const data = await fetchFieldGeoData(field.geojson as { coordinates: number[][][] });
      setGeoData({
        soil: data.soil ?? undefined,
        elevation: data.elevation ?? undefined,
      });
    } catch {
      // silent
    }
    setGeoDataLoading(false);
  }, []);

  async function handleSave() {
    if (!name || !areaHa) return;
    setLoading(true);
    setError(null);

    const area = parseFloat(areaHa);
    const count = parseInt(sectionCount) || 0;

    const { data: field, error: insertError } = await supabase
      .from("fields")
      .insert({
        farm_id: farmId,
        name,
        area_ha: area,
        notes: notes || null,
        geojson: drawnField?.geojson ?? null,
        nature_agreement: natureAgreement,
      })
      .select()
      .single();

    if (insertError) {
      setError("Kunne ikke gemme mark: " + insertError.message);
      setLoading(false);
      return;
    }

    if (field && count > 0) {
      const sectionArea = area / count;
      const sections = Array.from({ length: count }, (_, i) => ({
        farm_id: farmId,
        field_id: field.id,
        name: `${name} — Sektion ${i + 1}`,
        area_ha: Math.round(sectionArea * 100) / 100,
      }));
      await supabase.from("sections").insert(sections);
    }

    setLoading(false);
    setOpen(false);
    setName("");
    setAreaHa("");
    setSectionCount("");
    setNotes("");
    setNatureAgreement(false);
    setDrawnField(null);
    setGeoData(null);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        + Tilføj mark
      </button>
    );
  }

  const area = parseFloat(areaHa) || 0;
  const count = parseInt(sectionCount) || 0;
  const sectionArea = count > 0 ? (area / count).toFixed(2) : null;
  const initialCenter: [number, number] = farmLng && farmLat
    ? [farmLng, farmLat]
    : [11.0, 55.75];

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-earth-50">Ny mark</h3>

      <div>
        <label className="label">Navn på mark *</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="fx Nordfold, Vestmark..."
        />
      </div>

      {/* Kort eller manuel input */}
      {mapboxToken ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Markgrænserne</label>
            <button
              type="button"
              onClick={() => setUseMap(!useMap)}
              className="text-xs text-grass-600 font-medium"
            >
              {useMap ? "Indtast manuelt" : "Tegn på kort"}
            </button>
          </div>

          {useMap ? (
            <div className="space-y-2">
              <MapFieldEditor
                onFieldDrawn={handleFieldDrawn}
                mapboxToken={mapboxToken}
                initialCenter={initialCenter}
              />

              {/* Geodata der hentes automatisk */}
              {geoDataLoading && (
                <div className="rounded-xl px-4 py-3 text-sm text-earth-200 flex items-center gap-2" style={{ background: "rgba(30,80,120,0.15)" }}>
                  <Globe size={15} className="flex-shrink-0" />
                  Henter jordbundsdata og terræn...
                </div>
              )}
              {geoData && !geoDataLoading && (
                <div className="bg-earth-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide mb-2">
                    Automatisk indsamlet data
                  </p>
                  {geoData.soil && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-earth-300">Jordtype</span>
                        <span className="font-medium text-earth-100">
                          {geoData.soil.texture}
                        </span>
                      </div>
                      {geoData.soil.ph && (
                        <div className="flex justify-between text-sm">
                          <span className="text-earth-300">pH (0-30cm)</span>
                          <span className="font-medium text-earth-100">
                            {geoData.soil.ph.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {geoData.soil.organic_carbon && (
                        <div className="flex justify-between text-sm">
                          <span className="text-earth-300">Organisk kulstof</span>
                          <span className="font-medium text-earth-100">
                            {geoData.soil.organic_carbon.toFixed(1)} g/kg
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {geoData.elevation && (
                    <div className="flex justify-between text-sm">
                      <span className="text-earth-300">Højde</span>
                      <span className="font-medium text-earth-100">
                        {geoData.elevation.elevation_m} m.o.h.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                type="number"
                step="0.1"
                className="input"
                value={areaHa}
                onChange={(e) => setAreaHa(e.target.value)}
                placeholder="fx 3.0"
              />
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="label">Areal (hektar) *</label>
          <input
            type="number"
            step="0.1"
            className="input"
            value={areaHa}
            onChange={(e) => setAreaHa(e.target.value)}
            placeholder="fx 3.0"
          />
          <p className="text-xs text-earth-200 mt-1">
            Tilføj Mapbox-nøgle i Indstillinger for at tegne på kort
          </p>
        </div>
      )}

      {/* Vis beregnet areal hvis tegnet */}
      {drawnField && (
        <div>
          <label className="label">Beregnet areal</label>
          <input
            className="input bg-grass-50 font-semibold text-grass-800"
            value={`${areaHa} ha`}
            readOnly
          />
        </div>
      )}

      <div>
        <label className="label">Opdel i sektioner</label>
        <input
          type="number"
          className="input"
          value={sectionCount}
          onChange={(e) => setSectionCount(e.target.value)}
          placeholder="fx 8"
        />
        {sectionArea && (
          <p className="text-xs text-grass-400 mt-1 flex items-center gap-1">
            <Check size={11} />
            {count} sektioner à {sectionArea} ha
          </p>
        )}
      </div>

      <div>
        <label className="label">Noter</label>
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hegning, vandadgang, særlige forhold..."
        />
      </div>

      <button
        type="button"
        onClick={() => setNatureAgreement(!natureAgreement)}
        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${
          natureAgreement
            ? "border-grass-600"
            : "border-earth-700"
        }`}
        style={{ background: natureAgreement ? "rgba(99,107,60,0.15)" : "rgba(61,46,22,0.3)" }}
      >
        <div className="text-left">
          <p className={`text-sm font-semibold flex items-center gap-1.5 ${natureAgreement ? "text-grass-400" : "text-earth-200"}`}>
            <Leaf size={14} />
            Naturplejeaftale
          </p>
          <p className="text-xs text-earth-200 mt-0.5">
            EU-støttet aftale — begrænset indgreb, ingen tilsåning
          </p>
        </div>
        <div className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          natureAgreement ? "bg-grass-500" : "bg-earth-200"
        }`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            natureAgreement ? "translate-x-6" : "translate-x-1"
          }`} />
        </div>
      </button>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setOpen(false)}
          className="btn-secondary flex-1"
        >
          Annuller
        </button>
        <button
          onClick={handleSave}
          disabled={!name || !areaHa || loading}
          className="btn-primary flex-1"
        >
          {loading ? "Gemmer..." : "Gem mark"}
        </button>
      </div>
    </div>
  );
}
