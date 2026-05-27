"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Save } from "lucide-react";

type Species = { id: string; name_da: string; scientific_name: string | null; plant_type: string };

const VARIETY_TYPES = ["grøntsag", "urt", "frugt", "bær", "nød", "dækafgrøde", "blomst", "løg", "rod"];
const MONTHS = [
  { val: 1, label: "Januar" }, { val: 2, label: "Februar" }, { val: 3, label: "Marts" },
  { val: 4, label: "April" }, { val: 5, label: "Maj" }, { val: 6, label: "Juni" },
  { val: 7, label: "Juli" }, { val: 8, label: "August" }, { val: 9, label: "September" },
  { val: 10, label: "Oktober" }, { val: 11, label: "November" }, { val: 12, label: "December" },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-earth-400">{hint}</p>}
      {children}
    </div>
  );
}

function MonthSelect({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
      className="input w-full"
    >
      <option value="">{placeholder ?? "Vælg måned"}</option>
      {MONTHS.map((m) => (
        <option key={m.val} value={m.val}>{m.label}</option>
      ))}
    </select>
  );
}

export default function NySortPage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [saving, setSaving] = useState(false);
  const [farmId, setFarmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    species_id: "",
    name: "",
    synonyms: "",
    heritage: false,
    heritage_source: "",
    description: "",
    variety_type: "",
    direct_sow: false,
    indoor_propagation: false,
    sowing_depth_cm: "",
    germination_temp_min_c: "",
    germination_temp_opt_c: "",
    germination_days_min: "",
    germination_days_max: "",
    needs_bottom_heat: false,
    weeks_to_transplant: "",
    sow_indoor_from_month: null as number | null,
    sow_indoor_to_month: null as number | null,
    direct_sow_from_month: null as number | null,
    direct_sow_to_month: null as number | null,
    transplant_from_month: null as number | null,
    transplant_to_month: null as number | null,
    harvest_from_month: null as number | null,
    harvest_to_month: null as number | null,
    days_to_harvest_transplant: "",
    row_spacing_cm: "",
    plant_spacing_cm: "",
    sun_requirements: "",
    watering_needs: "",
    frost_hardy: false,
    polytunnel_benefit: "",
    needs_support: false,
    pinching_required: false,
    companion_plants: "",
    incompatible_with: "",
    care_notes: "",
    yield_kg_per_sqm_min: "",
    yield_kg_per_sqm_max: "",
    avg_market_price_dkk_kg: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: sp }, { data: { user } = {} as any }] = await Promise.all([
        supabase.from("crop_species").select("id, name_da, scientific_name, plant_type").order("name_da"),
        supabase.auth.getUser(),
      ]);
      if (sp) setSpecies(sp);
      if (user) {
        const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user.id).single();
        if (farm) setFarmId(farm.id);
      }
    }
    load();
  }, []);

  async function save() {
    if (!form.name || !form.species_id || !farmId) return;
    setSaving(true);
    const supabase = createClient();

    const payload = {
      species_id: form.species_id,
      name: form.name,
      synonyms: form.synonyms || null,
      heritage: form.heritage,
      heritage_source: form.heritage ? (form.heritage_source || null) : null,
      description: form.description || null,
      variety_type: form.variety_type || null,
      direct_sow: form.direct_sow,
      indoor_propagation: form.indoor_propagation,
      sowing_depth_cm: form.sowing_depth_cm ? parseFloat(form.sowing_depth_cm) : null,
      germination_temp_min_c: form.germination_temp_min_c ? parseInt(form.germination_temp_min_c) : null,
      germination_temp_opt_c: form.germination_temp_opt_c ? parseInt(form.germination_temp_opt_c) : null,
      germination_days_min: form.germination_days_min ? parseInt(form.germination_days_min) : null,
      germination_days_max: form.germination_days_max ? parseInt(form.germination_days_max) : null,
      needs_bottom_heat: form.needs_bottom_heat,
      weeks_to_transplant: form.weeks_to_transplant ? parseInt(form.weeks_to_transplant) : null,
      sow_indoor_from_month: form.sow_indoor_from_month,
      sow_indoor_to_month: form.sow_indoor_to_month,
      direct_sow_from_month: form.direct_sow_from_month,
      direct_sow_to_month: form.direct_sow_to_month,
      transplant_from_month: form.transplant_from_month,
      transplant_to_month: form.transplant_to_month,
      harvest_from_month: form.harvest_from_month,
      harvest_to_month: form.harvest_to_month,
      days_to_harvest_transplant: form.days_to_harvest_transplant ? parseInt(form.days_to_harvest_transplant) : null,
      row_spacing_cm: form.row_spacing_cm ? parseInt(form.row_spacing_cm) : null,
      plant_spacing_cm: form.plant_spacing_cm ? parseInt(form.plant_spacing_cm) : null,
      sun_requirements: form.sun_requirements || null,
      watering_needs: form.watering_needs || null,
      frost_hardy: form.frost_hardy,
      polytunnel_benefit: form.polytunnel_benefit || null,
      needs_support: form.needs_support,
      pinching_required: form.pinching_required,
      companion_plants: form.companion_plants || null,
      incompatible_with: form.incompatible_with || null,
      care_notes: form.care_notes || null,
      yield_kg_per_sqm_min: form.yield_kg_per_sqm_min ? parseFloat(form.yield_kg_per_sqm_min) : null,
      yield_kg_per_sqm_max: form.yield_kg_per_sqm_max ? parseFloat(form.yield_kg_per_sqm_max) : null,
      avg_market_price_dkk_kg: form.avg_market_price_dkk_kg ? parseFloat(form.avg_market_price_dkk_kg) : null,
      is_system_variety: false,
      farm_id: farmId,
    };

    const { data, error } = await supabase.from("crop_varieties").insert(payload).select("id").single();
    setSaving(false);
    if (!error && data) {
      router.push(`/farming/crops/${data.id}`);
    }
  }

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6 pb-32">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Ny sort</h1>
        <p className="text-earth-400 text-sm mt-0.5">Tilføj en gårdsspecifik sort med egne data</p>
      </div>

      {/* Identitet */}
      <div className="card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Identitet</h2>

        <Field label="Art *">
          <select value={form.species_id} onChange={(e) => set("species_id", e.target.value)} className="input w-full">
            <option value="">Vælg art…</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_da}{s.scientific_name ? ` (${s.scientific_name})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sortnavn *">
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
            placeholder="fx 'Black Cherry'" className="input w-full" />
        </Field>

        <Field label="Kategori">
          <select value={form.variety_type} onChange={(e) => set("variety_type", e.target.value)} className="input w-full">
            <option value="">Vælg…</option>
            {VARIETY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Beskrivelse">
          <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Sortnotes, smag, særlige egenskaber…" className="input w-full resize-none" />
        </Field>

        <Field label="Synonymer">
          <input type="text" value={form.synonyms} onChange={(e) => set("synonyms", e.target.value)}
            placeholder="Alternative navne eller handelsbetegnelser" className="input w-full" />
        </Field>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("heritage", !form.heritage)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: form.heritage ? "var(--grass)" : "var(--surface-raised)" }}>
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: form.heritage ? "translateX(20px)" : "translateX(0)" }} />
          </button>
          <span className="text-sm text-earth-200">Heritage-sort</span>
        </div>

        {form.heritage && (
          <Field label="Heritage-kilde">
            <input type="text" value={form.heritage_source} onChange={(e) => set("heritage_source", e.target.value)}
              placeholder="fx 'Frøsamlerne', 'Egne frø'" className="input w-full" />
          </Field>
        )}
      </div>

      {/* Formeringsmetode */}
      <div className="card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Formeringsmetode</h2>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => set("indoor_propagation", !form.indoor_propagation)}
            className="flex items-center gap-2 p-3 rounded-xl text-sm transition-colors"
            style={{
              background: form.indoor_propagation ? "rgba(251,146,60,0.15)" : "var(--surface-raised)",
              color: form.indoor_propagation ? "var(--clay)" : "var(--text-muted)",
              border: form.indoor_propagation ? "1px solid rgba(251,146,60,0.3)" : "1px solid transparent",
            }}>
            Forspires indendørs
          </button>
          <button type="button" onClick={() => set("direct_sow", !form.direct_sow)}
            className="flex items-center gap-2 p-3 rounded-xl text-sm transition-colors"
            style={{
              background: form.direct_sow ? "rgba(251,146,60,0.15)" : "var(--surface-raised)",
              color: form.direct_sow ? "var(--clay)" : "var(--text-muted)",
              border: form.direct_sow ? "1px solid rgba(251,146,60,0.3)" : "1px solid transparent",
            }}>
            Direkte såning
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sådybde (cm)">
            <input type="number" step="0.5" value={form.sowing_depth_cm}
              onChange={(e) => set("sowing_depth_cm", e.target.value)} className="input w-full" />
          </Field>
          <Field label="Forspiringsuger">
            <input type="number" value={form.weeks_to_transplant}
              onChange={(e) => set("weeks_to_transplant", e.target.value)} className="input w-full" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Spiringstemp. min (°C)">
            <input type="number" value={form.germination_temp_min_c}
              onChange={(e) => set("germination_temp_min_c", e.target.value)} className="input w-full" />
          </Field>
          <Field label="Spiringstemp. opt. (°C)">
            <input type="number" value={form.germination_temp_opt_c}
              onChange={(e) => set("germination_temp_opt_c", e.target.value)} className="input w-full" />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("needs_bottom_heat", !form.needs_bottom_heat)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: form.needs_bottom_heat ? "var(--grass)" : "var(--surface-raised)" }}>
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: form.needs_bottom_heat ? "translateX(20px)" : "translateX(0)" }} />
          </button>
          <span className="text-sm text-earth-200">Bundvarme anbefalet</span>
        </div>
      </div>

      {/* Kalender */}
      <div className="card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Kalender (dansk klima)</h2>

        {form.indoor_propagation && (
          <Field label="Forspiring indendørs">
            <div className="grid grid-cols-2 gap-2">
              <MonthSelect value={form.sow_indoor_from_month} onChange={(v) => set("sow_indoor_from_month", v)} placeholder="Fra" />
              <MonthSelect value={form.sow_indoor_to_month} onChange={(v) => set("sow_indoor_to_month", v)} placeholder="Til" />
            </div>
          </Field>
        )}

        {form.direct_sow && (
          <Field label="Direkte såning">
            <div className="grid grid-cols-2 gap-2">
              <MonthSelect value={form.direct_sow_from_month} onChange={(v) => set("direct_sow_from_month", v)} placeholder="Fra" />
              <MonthSelect value={form.direct_sow_to_month} onChange={(v) => set("direct_sow_to_month", v)} placeholder="Til" />
            </div>
          </Field>
        )}

        {form.indoor_propagation && (
          <Field label="Udplantning">
            <div className="grid grid-cols-2 gap-2">
              <MonthSelect value={form.transplant_from_month} onChange={(v) => set("transplant_from_month", v)} placeholder="Fra" />
              <MonthSelect value={form.transplant_to_month} onChange={(v) => set("transplant_to_month", v)} placeholder="Til" />
            </div>
          </Field>
        )}

        <Field label="Høst">
          <div className="grid grid-cols-2 gap-2">
            <MonthSelect value={form.harvest_from_month} onChange={(v) => set("harvest_from_month", v)} placeholder="Fra" />
            <MonthSelect value={form.harvest_to_month} onChange={(v) => set("harvest_to_month", v)} placeholder="Til" />
          </div>
        </Field>

        <Field label="Dage fra udplantning til høst">
          <input type="number" value={form.days_to_harvest_transplant}
            onChange={(e) => set("days_to_harvest_transplant", e.target.value)} className="input w-full" />
        </Field>
      </div>

      {/* Afstande og betingelser */}
      <div className="card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Afstande og betingelser</h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rækkeafstand (cm)">
            <input type="number" value={form.row_spacing_cm}
              onChange={(e) => set("row_spacing_cm", e.target.value)} className="input w-full" />
          </Field>
          <Field label="Planteafstand (cm)">
            <input type="number" value={form.plant_spacing_cm}
              onChange={(e) => set("plant_spacing_cm", e.target.value)} className="input w-full" />
          </Field>
        </div>

        <Field label="Sollys">
          <select value={form.sun_requirements} onChange={(e) => set("sun_requirements", e.target.value)} className="input w-full">
            <option value="">Vælg…</option>
            <option value="fuld sol">Fuld sol</option>
            <option value="halvskygge">Halvskygge</option>
            <option value="skygge">Skygge</option>
          </select>
        </Field>

        <Field label="Vandingsbehov">
          <select value={form.watering_needs} onChange={(e) => set("watering_needs", e.target.value)} className="input w-full">
            <option value="">Vælg…</option>
            <option value="lav">Lav</option>
            <option value="middel">Middel</option>
            <option value="høj">Høj</option>
          </select>
        </Field>

        <Field label="Polytunnel">
          <select value={form.polytunnel_benefit} onChange={(e) => set("polytunnel_benefit", e.target.value)} className="input w-full">
            <option value="">Vælg…</option>
            <option value="ikke nødvendig">Ikke nødvendig</option>
            <option value="anbefalet">Anbefalet</option>
            <option value="krævet">Krævet</option>
          </select>
        </Field>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("frost_hardy", !form.frost_hardy)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: form.frost_hardy ? "var(--grass)" : "var(--surface-raised)" }}>
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: form.frost_hardy ? "translateX(20px)" : "translateX(0)" }} />
          </button>
          <span className="text-sm text-earth-200">Frosttolerант</span>
        </div>
      </div>

      {/* Pleje */}
      <div className="card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Pleje</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => set("needs_support", !form.needs_support)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.needs_support ? "var(--grass)" : "var(--surface-raised)" }}>
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: form.needs_support ? "translateX(20px)" : "translateX(0)" }} />
            </button>
            <span className="text-sm text-earth-200">Opbinding</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => set("pinching_required", !form.pinching_required)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.pinching_required ? "var(--grass)" : "var(--surface-raised)" }}>
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: form.pinching_required ? "translateX(20px)" : "translateX(0)" }} />
            </button>
            <span className="text-sm text-earth-200">Nipning</span>
          </div>
        </div>

        <Field label="Kompanionplanter">
          <input type="text" value={form.companion_plants}
            onChange={(e) => set("companion_plants", e.target.value)}
            placeholder="fx 'Basilikum, tagetes, porrer'" className="input w-full" />
        </Field>

        <Field label="Undgå ved siden af">
          <input type="text" value={form.incompatible_with}
            onChange={(e) => set("incompatible_with", e.target.value)}
            placeholder="fx 'Fennikel, kål'" className="input w-full" />
        </Field>

        <Field label="Plejeguide">
          <textarea rows={4} value={form.care_notes} onChange={(e) => set("care_notes", e.target.value)}
            placeholder="Særlige plejeanvisninger, erfaringer fra marken…" className="input w-full resize-none" />
        </Field>
      </div>

      {/* Økonomi */}
      <div className="card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">Udbytte og økonomi</h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Udbytte min (kg/m²)">
            <input type="number" step="0.1" value={form.yield_kg_per_sqm_min}
              onChange={(e) => set("yield_kg_per_sqm_min", e.target.value)} className="input w-full" />
          </Field>
          <Field label="Udbytte maks (kg/m²)">
            <input type="number" step="0.1" value={form.yield_kg_per_sqm_max}
              onChange={(e) => set("yield_kg_per_sqm_max", e.target.value)} className="input w-full" />
          </Field>
        </div>

        <Field label="Vejl. markedspris (kr./kg)">
          <input type="number" step="1" value={form.avg_market_price_dkk_kg}
            onChange={(e) => set("avg_market_price_dkk_kg", e.target.value)} className="input w-full" />
        </Field>
      </div>

      {/* Gem */}
      <button
        onClick={save}
        disabled={!form.name || !form.species_id || saving}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Save size={18} />
        {saving ? "Gemmer…" : "Gem sort"}
      </button>
    </div>
  );
}
