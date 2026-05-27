"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Rows3, LayoutGrid, Droplets } from "lucide-react";
import { sectionDimensions } from "@/lib/bedGeometry";

type Mode = "section" | "bed";

export default function NytBedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("section");
  const [saving, setSaving] = useState(false);

  // Sektion-felter
  const [sectionName, setSectionName] = useState("");
  const [bedCount, setBedCount] = useState(6);
  const [bedLengthM, setBedLengthM] = useState(10);
  const [bedWidthM, setBedWidthM] = useState(0.75);
  const [pathWidthM, setPathWidthM] = useState(0.4);
  const [locationType, setLocationType] = useState<"friland" | "polytunnel" | "drivhus_opvarmet">("friland");

  // Enkelt bed-felter
  const [bedName, setBedName] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [widthM, setWidthM] = useState("");
  const [hasDrip, setHasDrip] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [notes, setNotes] = useState("");
  const [bedLocationType, setBedLocationType] = useState<"friland" | "polytunnel" | "drivhus_opvarmet">("friland");

  const dims = sectionDimensions({ bedCount, bedLengthM, bedWidthM, pathWidthM });

  async function createSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionName.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) { setSaving(false); return; }

    await supabase.from("bed_sections").insert({
      farm_id: farm.id,
      name: sectionName.trim(),
      bed_count: bedCount,
      bed_length_m: bedLengthM,
      bed_width_m: bedWidthM,
      path_width_m: pathWidthM,
      location_type: locationType,
      // center_lat / center_lng sættes på kortet
    });

    setSaving(false);
    router.push("/farming/beds/map");
  }

  async function createBed(e: React.FormEvent) {
    e.preventDefault();
    if (!bedName.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();
    if (!farm) { setSaving(false); return; }

    const { data: bed } = await supabase.from("beds").insert({
      farm_id: farm.id,
      name: bedName.trim(),
      length_m: lengthM ? Number(lengthM) : null,
      width_m: widthM ? Number(widthM) : null,
      has_drip_irrigation: hasDrip,
      location_note: locationNote || null,
      location_type: bedLocationType,
      notes: notes || null,
      status: "aktiv",
    }).select("id").single();

    setSaving(false);
    router.push("/farming/beds/map");
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Nyt bed</h1>
        <p className="text-sm text-earth-300 mt-0.5">Vælg type</p>
      </div>

      {/* Type-valg */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("section")}
          className="rounded-2xl p-4 text-left transition-all"
          style={{
            background: mode === "section" ? "var(--surface-raised)" : "var(--surface)",
            border: mode === "section" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <LayoutGrid size={20} className="mb-2" style={{ color: mode === "section" ? "var(--clay)" : "var(--text-subtle)" }} />
          <p className="font-semibold text-sm text-earth-100">Sektion</p>
          <p className="text-[11px] text-earth-500 mt-0.5 leading-relaxed">
            Flere bede ved siden af hinanden — placeres på kortet
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode("bed")}
          className="rounded-2xl p-4 text-left transition-all"
          style={{
            background: mode === "bed" ? "var(--surface-raised)" : "var(--surface)",
            border: mode === "bed" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Rows3 size={20} className="mb-2" style={{ color: mode === "bed" ? "var(--clay)" : "var(--text-subtle)" }} />
          <p className="font-semibold text-sm text-earth-100">Enkelt bed</p>
          <p className="text-[11px] text-earth-500 mt-0.5 leading-relaxed">
            Ét fritliggende bed — uden kortplacering
          </p>
        </button>
      </div>

      {/* Sektion-formular */}
      {mode === "section" && (
        <form onSubmit={createSection} className="space-y-4">
          <div className="card space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Sektionskonfiguration</h2>

            <div>
              <label className="label">Sektionsnavn *</label>
              <input
                required
                className="input w-full mt-1"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="fx Havesektionen, Nordbed, Polytunnel 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Antal bede</label>
                <input
                  type="number" min="1" max="50"
                  className="input w-full mt-1"
                  value={bedCount}
                  onChange={(e) => setBedCount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Bedelængde (m)</label>
                <input
                  type="number" step="0.5" min="0.5"
                  className="input w-full mt-1"
                  value={bedLengthM}
                  onChange={(e) => setBedLengthM(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Bededbredde (m)</label>
                <input
                  type="number" step="0.05" min="0.3"
                  className="input w-full mt-1"
                  value={bedWidthM}
                  onChange={(e) => setBedWidthM(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Gangbredde (m)</label>
                <input
                  type="number" step="0.05" min="0.1"
                  className="input w-full mt-1"
                  value={pathWidthM}
                  onChange={(e) => setPathWidthM(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Placeringstype */}
            <div>
              <label className="label">Placering</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {([
                  { v: "friland",          l: "Friland" },
                  { v: "polytunnel",       l: "Polytunnel" },
                  { v: "drivhus_opvarmet", l: "Opvarmet drivhus" },
                ] as { v: typeof locationType; l: string }[]).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setLocationType(opt.v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: locationType === opt.v ? "var(--clay)" : "var(--surface-raised)",
                      color: locationType === opt.v ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview af mål */}
            <div
              className="rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs"
              style={{ background: "var(--surface-raised)" }}
            >
              <div>
                <p className="text-earth-500">Samlet bredde</p>
                <p className="text-earth-100 font-semibold mt-0.5">{dims.totalWidthM} m</p>
              </div>
              <div>
                <p className="text-earth-500">Dyrkningsareal</p>
                <p className="text-earth-100 font-semibold mt-0.5">{dims.bedAreaM2} m²</p>
              </div>
              <div>
                <p className="text-earth-500">Totalt areal</p>
                <p className="text-earth-100 font-semibold mt-0.5">{dims.totalAreaM2} m²</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-earth-500 text-center">
            Efter oprettelse placerer du sektionen på kortet
          </p>

          <button
            type="submit"
            disabled={saving || !sectionName.trim()}
            className="btn-primary w-full disabled:opacity-40"
          >
            {saving ? "Opretter…" : "Opret sektion → placer på kort"}
          </button>
        </form>
      )}

      {/* Enkelt bed-formular */}
      {mode === "bed" && (
        <form onSubmit={createBed} className="space-y-4">
          <div className="card space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Bed</h2>

            <div>
              <label className="label">Navn *</label>
              <input
                required
                className="input w-full mt-1"
                value={bedName}
                onChange={(e) => setBedName(e.target.value)}
                placeholder="fx Tomatbed, Nordbed, Bed 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Længde (m)</label>
                <input type="number" step="0.1" min="0" className="input w-full mt-1"
                  value={lengthM} onChange={(e) => setLengthM(e.target.value)} placeholder="3.6" />
              </div>
              <div>
                <label className="label">Bredde (m)</label>
                <input type="number" step="0.1" min="0" className="input w-full mt-1"
                  value={widthM} onChange={(e) => setWidthM(e.target.value)} placeholder="1.2" />
              </div>
            </div>
            {lengthM && widthM && (
              <p className="text-xs text-earth-500 -mt-2">Areal: {(Number(lengthM) * Number(widthM)).toFixed(1)} m²</p>
            )}

            {/* Placeringstype */}
            <div>
              <label className="label">Placering</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {([
                  { v: "friland",          l: "Friland" },
                  { v: "polytunnel",       l: "Polytunnel" },
                  { v: "drivhus_opvarmet", l: "Opvarmet drivhus" },
                ] as { v: typeof bedLocationType; l: string }[]).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setBedLocationType(opt.v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: bedLocationType === opt.v ? "var(--clay)" : "var(--surface-raised)",
                      color: bedLocationType === opt.v ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHasDrip(!hasDrip)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: hasDrip ? "rgba(56,189,248,0.12)" : "var(--surface-raised)",
                color: hasDrip ? "#38bdf8" : "var(--text-muted)",
                border: hasDrip ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
              }}
            >
              <Droplets size={15} />
              Drypvanding installeret
            </button>

            <div>
              <label className="label">Placering</label>
              <input className="input w-full mt-1" value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)} placeholder="fx Sydvendt hjørne, ved laden" />
            </div>

            <div>
              <label className="label">Noter</label>
              <textarea rows={2} className="input w-full mt-1 resize-none" value={notes}
                onChange={(e) => setNotes(e.target.value)} placeholder="Jordforhold, kompost osv." />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !bedName.trim()}
            className="btn-primary w-full disabled:opacity-40"
          >
            {saving ? "Opretter…" : "Opret bed"}
          </button>
        </form>
      )}
    </div>
  );
}
