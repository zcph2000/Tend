import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  Sun, Droplets, Thermometer, Leaf, Calendar, Ruler,
  Wind, ArrowUpDown, FlaskConical, Info, CircleAlert, Bird
} from "lucide-react";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function monthRange(from: number | null, to: number | null) {
  if (!from) return null;
  if (from === to) return MONTHS[from];
  return `${MONTHS[from ?? 1]}–${MONTHS[to ?? 12]}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-earth-400">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-earth-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-earth-100 text-right">{value}</span>
    </div>
  );
}

function Bool({ val }: { val: boolean }) {
  return <span style={{ color: val ? "var(--grass)" : "var(--text-subtle)" }}>{val ? "Ja" : "Nej"}</span>;
}

export default async function AfgrodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("crop_varieties")
    .select(`
      *,
      crop_species (
        name_da, scientific_name, plant_type,
        crop_families ( name_da, scientific_name )
      )
    `)
    .eq("id", id)
    .single();

  if (!v) notFound();

  const species = v.crop_species as any;
  const family = species?.crop_families as any;

  const sowIndoor = monthRange(v.sow_indoor_from_month, v.sow_indoor_to_month);
  const directSow = monthRange(v.direct_sow_from_month, v.direct_sow_to_month);
  const transplant = monthRange(v.transplant_from_month, v.transplant_to_month);
  const harvest = monthRange(v.harvest_from_month, v.harvest_to_month);

  const TYPE_LABELS: Record<string, string> = {
    grøntsag: "Grøntsag", urt: "Urt", frugt: "Frugt", bær: "Bær",
    nød: "Nød", dækafgrøde: "Dækafgrøde", blomst: "Blomst", løg: "Løg", rod: "Rod",
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-earth-50">{v.name}</h1>
          {v.heritage && (
            <span
              className="mt-1 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1"
              style={{ background: "rgba(34,197,94,0.15)", color: "var(--grass)" }}
            >
              <Leaf size={11} />
              Heritage
            </span>
          )}
        </div>

        {species && (
          <p className="text-earth-300 text-sm mt-1">
            {species.name_da}
            {species.scientific_name && (
              <em className="text-earth-500"> · {species.scientific_name}</em>
            )}
          </p>
        )}
        {family && (
          <p className="text-earth-500 text-xs mt-0.5">
            {family.name_da} ({family.scientific_name})
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          {v.variety_type && (
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{ background: "var(--surface-raised)", color: "var(--text-subtle)" }}
            >
              {TYPE_LABELS[v.variety_type] ?? v.variety_type}
            </span>
          )}
          {species?.plant_type && (
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{ background: "var(--surface-raised)", color: "var(--text-subtle)" }}
            >
              {species.plant_type}
            </span>
          )}
          {v.polytunnel_benefit === "krævet" && (
            <span
              className="px-2 py-0.5 rounded text-xs flex items-center gap-1"
              style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}
            >
              <Wind size={10} />
              Polytunnel krævet
            </span>
          )}
          {v.polytunnel_benefit === "anbefalet" && (
            <span
              className="px-2 py-0.5 rounded text-xs flex items-center gap-1"
              style={{ background: "rgba(251,191,36,0.08)", color: "#d97706" }}
            >
              <Wind size={10} />
              Polytunnel anbefalet
            </span>
          )}
        </div>

        {v.description && (
          <p className="text-sm text-earth-300 mt-3 leading-relaxed">{v.description}</p>
        )}

        {v.heritage && v.heritage_source && (
          <p className="text-xs text-earth-400 mt-2">
            Heritage-kilde: <span className="text-earth-300">{v.heritage_source}</span>
          </p>
        )}
      </div>

      {/* Kalender / timing */}
      {(sowIndoor || directSow || transplant || harvest) && (
        <Section title="Kalender">
          <Row label="Forspiring indendørs" value={sowIndoor} />
          <Row label="Direkte såning" value={directSow} />
          <Row label="Udplantning" value={transplant} />
          <Row label="Høstvindue" value={harvest} />
          {v.weeks_to_transplant && (
            <Row label="Uger fra såning til udplantning" value={`${v.weeks_to_transplant} uger`} />
          )}
          {v.days_to_harvest_transplant && (
            <Row label="Dage fra udplantning til høst" value={`${v.days_to_harvest_transplant} dage`} />
          )}
        </Section>
      )}

      {/* Formeringsmetode */}
      <Section title="Formeringsmetode">
        <Row label="Direkte såning" value={<Bool val={v.direct_sow} />} />
        <Row label="Forspires indendørs" value={<Bool val={v.indoor_propagation} />} />
        {v.sowing_depth_cm != null && (
          <Row label="Sådybde" value={`${v.sowing_depth_cm} cm`} />
        )}
        {(v.germination_temp_min_c != null || v.germination_temp_opt_c != null) && (
          <Row
            label="Spiringstemperatur"
            value={
              v.germination_temp_min_c != null && v.germination_temp_opt_c != null
                ? `${v.germination_temp_min_c}–${v.germination_temp_opt_c}°C`
                : v.germination_temp_opt_c != null
                ? `${v.germination_temp_opt_c}°C`
                : `min. ${v.germination_temp_min_c}°C`
            }
          />
        )}
        {(v.germination_days_min != null || v.germination_days_max != null) && (
          <Row
            label="Spiringstid"
            value={
              v.germination_days_min != null && v.germination_days_max != null
                ? `${v.germination_days_min}–${v.germination_days_max} dage`
                : `${v.germination_days_min ?? v.germination_days_max} dage`
            }
          />
        )}
        {v.needs_bottom_heat && <Row label="Bundvarme anbefalet" value={<Bool val={true} />} />}
        {v.light_germinator && <Row label="Lysspirer (lægges på overfladen)" value={<Bool val={true} />} />}
        {v.needs_stratification && <Row label="Kræver stratificering" value={<Bool val={true} />} />}
        {v.needs_scarification && <Row label="Kræver skarificering" value={<Bool val={true} />} />}
      </Section>

      {/* Afstande */}
      {(v.row_spacing_cm || v.plant_spacing_cm || v.plants_per_sqm) && (
        <Section title="Afstande">
          {v.row_spacing_cm && <Row label="Rækkeafstand" value={`${v.row_spacing_cm} cm`} />}
          {v.plant_spacing_cm && <Row label="Planteafstand i rækken" value={`${v.plant_spacing_cm} cm`} />}
          {v.plants_per_sqm && <Row label="Planter pr. m²" value={v.plants_per_sqm} />}
        </Section>
      )}

      {/* Vækstbetingelser */}
      <Section title="Vækstbetingelser">
        {v.sun_requirements && <Row label="Sollys" value={v.sun_requirements} />}
        {(v.soil_ph_min || v.soil_ph_max) && (
          <Row
            label="Jord-pH"
            value={
              v.soil_ph_min && v.soil_ph_max
                ? `${v.soil_ph_min}–${v.soil_ph_max}`
                : `${v.soil_ph_min ?? v.soil_ph_max}`
            }
          />
        )}
        {v.watering_needs && <Row label="Vandingsbehov" value={v.watering_needs} />}
        <Row label="Frosttolerант" value={<Bool val={v.frost_hardy} />} />
        {v.min_survival_temp_c != null && (
          <Row label="Laveste overlevelsestemp." value={`${v.min_survival_temp_c}°C`} />
        )}
      </Section>

      {/* Pleje */}
      {(v.needs_support || v.pinching_required || v.care_notes || v.companion_plants || v.incompatible_with) && (
        <Section title="Pleje">
          {v.needs_support && <Row label="Kræver opbinding" value={<Bool val={true} />} />}
          {v.pinching_required && <Row label="Nipning nødvendig" value={<Bool val={true} />} />}
          {v.care_notes && (
            <p className="text-sm text-earth-300 leading-relaxed">{v.care_notes}</p>
          )}
          {v.companion_plants && (
            <div>
              <p className="text-xs text-earth-400 mb-1">Kompanionplanter</p>
              <p className="text-sm text-earth-200">{v.companion_plants}</p>
            </div>
          )}
          {v.incompatible_with && (
            <div>
              <p className="text-xs text-earth-400 mb-1 flex items-center gap-1">
                <CircleAlert size={11} />
                Undgå ved siden af
              </p>
              <p className="text-sm text-earth-200">{v.incompatible_with}</p>
            </div>
          )}
        </Section>
      )}

      {/* Udbytte og økonomi */}
      {(v.yield_kg_per_sqm_min || v.yield_kg_per_sqm_max || v.avg_market_price_dkk_kg) && (
        <Section title="Udbytte og økonomi">
          {(v.yield_kg_per_sqm_min || v.yield_kg_per_sqm_max) && (
            <Row
              label="Udbytte"
              value={
                v.yield_kg_per_sqm_min && v.yield_kg_per_sqm_max
                  ? `${v.yield_kg_per_sqm_min}–${v.yield_kg_per_sqm_max} kg/m²`
                  : `${v.yield_kg_per_sqm_min ?? v.yield_kg_per_sqm_max} kg/m²`
              }
            />
          )}
          {v.avg_market_price_dkk_kg && (
            <Row label="Vejl. markedspris" value={`${v.avg_market_price_dkk_kg} kr./kg`} />
          )}
          {v.yield_kg_per_sqm_min && v.avg_market_price_dkk_kg && (
            <Row
              label="Potentielt afkast"
              value={`${(v.yield_kg_per_sqm_min * v.avg_market_price_dkk_kg).toFixed(0)}–${(v.yield_kg_per_sqm_max * v.avg_market_price_dkk_kg).toFixed(0)} kr./m²`}
            />
          )}
        </Section>
      )}

      {/* Flerårige / vedplanter */}
      {(v.years_to_first_harvest || v.pruning_notes || v.animal_integration || v.establishment_notes) && (
        <Section title="Etablering og flerårig pleje">
          {v.years_to_first_harvest && (
            <Row label="År til første høst" value={`${v.years_to_first_harvest} år`} />
          )}
          {v.establishment_years && (
            <Row label="Etableringsfase" value={`${v.establishment_years} år`} />
          )}
          {v.establishment_notes && (
            <p className="text-sm text-earth-300 leading-relaxed">{v.establishment_notes}</p>
          )}
          {monthRange(v.pruning_month_from, v.pruning_month_to) && (
            <Row label="Beskæringsvindue" value={monthRange(v.pruning_month_from, v.pruning_month_to)} />
          )}
          {v.pruning_notes && (
            <p className="text-sm text-earth-300 leading-relaxed">{v.pruning_notes}</p>
          )}
          {v.animal_integration && (
            <div>
              <p className="text-xs text-earth-400 mb-1 flex items-center gap-1">
                <Bird size={11} />
                Dyreintegration
              </p>
              <p className="text-sm text-earth-200">{v.animal_integration}</p>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
