import { SupabaseClient } from "@supabase/supabase-js";

// In-memory cache: én vejr-hentning pr. serverinstans pr. time
let _weatherCache: { summary: string; lat: number; lng: number; expires: number } | null = null;

async function getWeatherSummary(lat: number, lng: number): Promise<string> {
  const now = Date.now();
  if (_weatherCache && _weatherCache.expires > now && _weatherCache.lat === lat && _weatherCache.lng === lng) {
    return _weatherCache.summary;
  }
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lng.toString());
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code");
    url.searchParams.set("timezone", "Europe/Copenhagen");
    url.searchParams.set("past_days", "14");
    url.searchParams.set("forecast_days", "3");

    const res = await fetch(url.toString());
    if (!res.ok) return "";

    const json = await res.json();
    const d = json.daily;

    // Indices 0–13 = past 14 days, 14–16 = today + next 2 days
    const past14Precip: number[] = d.precipitation_sum.slice(0, 14);
    const past14TempMax: number[] = d.temperature_2m_max.slice(0, 14);
    const totalRain = past14Precip.reduce((s, v) => s + (v ?? 0), 0);
    const validTemps = past14TempMax.filter((v) => v != null);
    const avgMax = validTemps.length > 0
      ? validTemps.reduce((s, v) => s + v, 0) / validTemps.length
      : 0;
    const rainDays = past14Precip.filter((v) => (v ?? 0) > 1).length;

    let summary = `## Vejr\n`;
    summary += `Seneste 14 dage: ${totalRain.toFixed(0)} mm nedbør (${rainDays} regndage) · gns. maks ${avgMax.toFixed(1)}°C\n`;

    const futureDates: string[] = d.time.slice(14, 17);
    const futureRain: number[] = d.precipitation_sum.slice(14, 17);
    const futureTempMax: number[] = d.temperature_2m_max.slice(14, 17);

    if (futureDates.length > 0) {
      const forecastStr = futureDates
        .map((date: string, i: number) =>
          `${date}: ${(futureTempMax[i] ?? 0).toFixed(0)}°C · ${(futureRain[i] ?? 0).toFixed(0)} mm`
        )
        .join(" | ");
      summary += `Prognose næste 3 dage: ${forecastStr}\n`;
    }

    _weatherCache = { summary, lat, lng, expires: now + 60 * 60 * 1000 };
    return summary;
  } catch {
    return "";
  }
}

function purposeAnimalDa(purpose: string | null): string {
  const labels: Record<string, string> = {
    moderdyr: "Moderdyr",
    avlsvædder: "Avlsvædder",
    opfedning: "Til opfedning/slagtning",
    naturpleje: "Naturpleje",
    salgsdyr: "Til videresalg",
  };
  return labels[purpose ?? ""] ?? "Uspecificeret formål";
}

function purposeSectionDa(purpose: string | null): string {
  const labels: Record<string, string> = {
    naturpleje: "Naturpleje (begrænset indgreb)",
    produktion: "Produktionsmark",
    opfedning: "Opfedningsmark",
    høst: "Reserveret til høst",
    hvilende: "Hvilende / genopretning",
  };
  return labels[purpose ?? ""] ?? "";
}

function eventTypeDa(type: string): string {
  const labels: Record<string, string> = {
    vaccination: "Vaccination",
    worming: "Ormekur",
    tupping: "Sat til vædder",
    lambing: "Lammede",
    weighing: "Vejet",
    treatment: "Behandling",
    observation: "Observation",
    note: "Note",
    slaughtering: "Slagtet",
    sale: "Solgt",
  };
  return labels[type] ?? type;
}

function seasonDa(month: number): string {
  if (month >= 3 && month <= 4) return "forår (marts–april) — græs skyder, lang hvile stadig vigtig";
  if (month >= 5 && month <= 8) return "sommer (maj–august) — høj vækst, kortere hvileperiode mulig";
  if (month >= 9 && month <= 10) return "efterår (september–oktober) — væksten aftager, hvile forlænges";
  return "vinter (november–februar) — minimal vækst, lang hvileperiode nødvendig";
}

export async function buildFarmContext(
  supabase: SupabaseClient,
  farmId: string
): Promise<string> {
  const today = new Date();
  const month = today.getMonth() + 1;

  const [
    { data: farm },
    { data: fields },
    { data: animals },
    { data: flocks },
    { data: activeGrazing },
    { data: pastGrazing },
    { data: recentEvents },
    { data: soilObs },
    { data: biodivObs },
    { data: beds },
    { data: polytunnels },
    { data: seeds },
    { data: fruitPlants },
    { data: compostHeaps },
  ] = await Promise.all([
    supabase.from("farms").select("*").eq("id", farmId).single(),
    supabase.from("fields").select("*, sections(*)").eq("farm_id", farmId),
    supabase.from("animals").select("*").eq("farm_id", farmId).eq("status", "active"),
    supabase.from("flocks").select("*").eq("farm_id", farmId),
    supabase
      .from("grazing_records")
      .select("*, flock:flocks(name), section:sections(name, area_ha, field:fields(name))")
      .eq("farm_id", farmId)
      .is("end_date", null),
    supabase
      .from("grazing_records")
      .select("start_date, end_date, notes, flock:flocks(name), section:sections(name, area_ha, field:fields(name))")
      .eq("farm_id", farmId)
      .not("end_date", "is", null)
      .order("end_date", { ascending: false })
      .limit(20),
    supabase
      .from("animal_events")
      .select("*, animal:animals(ear_tag, name)")
      .eq("farm_id", farmId)
      .order("event_date", { ascending: false })
      .limit(15),
    supabase
      .from("soil_observations")
      .select("*, field:fields(name)")
      .eq("farm_id", farmId)
      .order("observed_at", { ascending: false })
      .limit(20),
    supabase
      .from("biodiversity_observations")
      .select("observed_at, category, species_name, count, location_note, field:fields(name)")
      .eq("farm_id", farmId)
      .order("observed_at", { ascending: false })
      .limit(30),
    supabase
      .from("beds")
      .select("name, area_m2, status, location_note, soil_notes, bed_plantings(crop_name, variety, status, sowed_at, expected_harvest_at, companion_plants)")
      .eq("farm_id", farmId),
    supabase
      .from("polytunnels")
      .select("name, length_m, width_m, status, notes, polytunnel_plantings(crop_name, variety, status, sowed_at, expected_harvest_at)")
      .eq("farm_id", farmId),
    supabase
      .from("seeds")
      .select("crop_name, variety, quantity_g, quantity_seeds, sowing_from_month, sowing_to_month, best_before_year, notes")
      .eq("farm_id", farmId),
    supabase
      .from("fruit_plants")
      .select("name, plant_type, variety, planted_year, quantity, status, location_note, notes")
      .eq("farm_id", farmId),
    supabase
      .from("compost_heaps")
      .select("name, type, status, started_at, ready_at, notes")
      .eq("farm_id", farmId),
  ]);

  // Vejr — fetch parallelt med Supabase-data
  const weatherSummary = await getWeatherSummary(
    (farm as { lat?: number } | null)?.lat ?? 55.75,
    (farm as { lng?: number } | null)?.lng ?? 11.0
  );

  const dateStr = today.toLocaleDateString("da-DK", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  let ctx = `# Gårdsdata — ${farm?.name ?? "Ukendt gård"}\n`;
  ctx += `Dato: ${dateStr}\n`;
  ctx += `Sæson: ${seasonDa(month)}\n\n`;

  // Vejr
  if (weatherSummary) {
    ctx += weatherSummary + "\n";
  }

  // Gårdsprofil
  if (farm?.profile) {
    ctx += `## Gårdens profil og intentioner\n${farm.profile}\n\n`;
  }

  // Marker og sektioner
  ctx += `## Marker og sektioner\n`;
  const totalArea = (fields ?? []).reduce((sum, f) => sum + (f.area_ha ?? 0), 0);
  ctx += `Samlet areal: ${totalArea.toFixed(1)} ha fordelt på ${fields?.length ?? 0} marker\n\n`;

  for (const field of fields ?? []) {
    ctx += `### ${field.name} (${field.area_ha} ha)`;
    if (field.nature_agreement) ctx += ` — NATURPLEJEAFTALE`;
    if (field.soil_type) ctx += ` — jordtype: ${field.soil_type}`;
    if (field.notes) ctx += `\n${field.notes}`;
    ctx += `\nSektioner:\n`;

    type SectionRow = { name: string; area_ha: number; purpose?: string | null; notes?: string | null };
    for (const section of (field.sections ?? []) as SectionRow[]) {
      ctx += `  - ${section.name}: ${section.area_ha} ha`;
      if (section.purpose) ctx += ` [${purposeSectionDa(section.purpose)}]`;
      if (section.notes) ctx += ` — ${section.notes}`;
      ctx += `\n`;
    }

    // Seneste jordobservation for denne mark
    type SoilObs = {
      field: { name: string } | null;
      observed_at: string;
      ph?: number | null;
      organic_matter_pct?: number | null;
      earthworm_count?: number | null;
      water_retention?: number | null;
      compaction?: number | null;
      notes?: string | null;
    };
    const fieldSoil = (soilObs as SoilObs[] | null)
      ?.filter(o => (o.field as { name: string } | null)?.name === field.name)
      ?.[0];

    if (fieldSoil) {
      ctx += `  Jordsundhed (${fieldSoil.observed_at}):`;
      if (fieldSoil.ph != null) ctx += ` pH ${fieldSoil.ph}`;
      if (fieldSoil.organic_matter_pct != null) ctx += ` · OM ${fieldSoil.organic_matter_pct}%`;
      if (fieldSoil.earthworm_count != null) ctx += ` · ${fieldSoil.earthworm_count} orme/m²`;
      if (fieldSoil.water_retention != null) ctx += ` · vandretention ${fieldSoil.water_retention}/5`;
      if (fieldSoil.compaction != null) ctx += ` · kompaktering ${fieldSoil.compaction}/5`;
      if (fieldSoil.notes) ctx += ` — ${fieldSoil.notes}`;
      ctx += `\n`;

      // Er der ældre målinger? Vis trend
      const olderSoil = (soilObs as SoilObs[] | null)
        ?.filter(o => (o.field as { name: string } | null)?.name === field.name)
        ?.slice(1, 3);
      if (olderSoil && olderSoil.length > 0 && fieldSoil.organic_matter_pct != null) {
        const older = olderSoil.find(o => o.organic_matter_pct != null);
        if (older?.organic_matter_pct != null) {
          const diff = fieldSoil.organic_matter_pct - older.organic_matter_pct;
          const trend = diff > 0 ? `↑ +${diff.toFixed(1)}%` : diff < 0 ? `↓ ${diff.toFixed(1)}%` : "→ uændret";
          ctx += `  OM-trend siden ${older.observed_at}: ${trend} (≈ ${Math.abs(diff * 11).toFixed(0)} tons CO2/ha ${diff >= 0 ? "bundet" : "frigivet"})\n`;
        }
      }
    }
  }

  // Besætning
  ctx += `\n## Besætning\n`;
  const activeAnimals = animals ?? [];
  const females = activeAnimals.filter(a => a.sex === "female").length;
  const males = activeAnimals.filter(a => a.sex === "male").length;
  const castrated = activeAnimals.filter(a => a.sex === "castrated").length;
  ctx += `Total aktive dyr: ${activeAnimals.length} (${females} hunner, ${males} hanner, ${castrated} kastrerede)\n`;

  const byPurpose: Record<string, typeof activeAnimals> = {};
  for (const a of activeAnimals) {
    const p = (a.purpose as string | null) ?? "uspecificeret";
    byPurpose[p] = [...(byPurpose[p] ?? []), a];
  }
  for (const [purpose, group] of Object.entries(byPurpose)) {
    ctx += `\n**${purposeAnimalDa(purpose)}**: ${group.length} dyr\n`;
    const withNotes = group.filter(a => a.notes);
    for (const a of withNotes) {
      ctx += `  - ${a.name ?? a.ear_tag}: ${a.notes}\n`;
    }
  }

  // Flokke
  if (flocks && flocks.length > 0) {
    ctx += `\n## Flokke\n`;
    for (const flock of flocks) {
      const count = activeAnimals.filter(a => a.flock_id === flock.id).length;
      ctx += `- ${flock.name}: ${count} dyr`;
      if (flock.notes) ctx += ` — ${flock.notes}`;
      ctx += `\n`;
    }
  }

  // Aktiv afgræsning
  ctx += `\n## Aktiv afgræsning\n`;
  if (!activeGrazing || activeGrazing.length === 0) {
    ctx += `Ingen aktiv afgræsning registreret.\n`;
  } else {
    for (const record of activeGrazing) {
      const flock = record.flock as { name: string } | null;
      const section = record.section as { name: string; area_ha: number; field: { name: string } | null } | null;
      const days = Math.floor(
        (today.getTime() - new Date(record.start_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const animalCount = activeAnimals.filter(a => {
        const f = flocks?.find(fl => fl.name === flock?.name);
        return f && a.flock_id === f.id;
      }).length;
      const density = section?.area_ha && animalCount > 0
        ? Math.round(animalCount / section.area_ha)
        : null;
      ctx += `- ${flock?.name ?? "Flok"} på ${section?.field?.name ?? ""}/${section?.name ?? "sektion"} (${section?.area_ha ?? "?"} ha) — dag ${days}`;
      if (density) ctx += ` — ${density} dyr/ha`;
      ctx += `\n`;
    }
  }

  // Seneste hændelser
  if (recentEvents && recentEvents.length > 0) {
    ctx += `\n## Seneste hændelser\n`;
    for (const ev of recentEvents) {
      const animal = ev.animal as { ear_tag: string; name: string | null } | null;
      ctx += `- ${ev.event_date}: ${eventTypeDa(ev.event_type)} — ${animal?.name ?? animal?.ear_tag ?? "Ukendt"}`;
      if (ev.notes) ctx += ` (${ev.notes})`;
      ctx += `\n`;
    }
  }

  // Rotationshistorik (afsluttede afgræsninger)
  if (pastGrazing && pastGrazing.length > 0) {
    ctx += `\n## Rotationshistorik\n`;
    type PastRecord = {
      start_date: string;
      end_date: string;
      notes?: string | null;
      flock: { name: string } | null;
      section: { name: string; area_ha: number; field: { name: string } | null } | null;
    };
    for (const record of (pastGrazing as unknown as PastRecord[])) {
      const flock = record.flock;
      const section = record.section;
      const days = Math.round(
        (new Date(record.end_date).getTime() - new Date(record.start_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      ctx += `- ${record.end_date}: ${flock?.name ?? "Flok"} på ${section?.field?.name ?? "?"}/${section?.name ?? "sektion"} — ${days} dage`;
      if (record.notes) ctx += ` (${record.notes})`;
      ctx += `\n`;
    }
  }

  // Jordbrug — bede, polytunnel, frø, frugtplantage, kompost
  const hasJordbrug = (beds?.length ?? 0) + (polytunnels?.length ?? 0) + (seeds?.length ?? 0) +
    (fruitPlants?.length ?? 0) + (compostHeaps?.length ?? 0) > 0;

  if (hasJordbrug) {
    ctx += `\n## Jordbrug\n`;

    // Bede
    if (beds && beds.length > 0) {
      ctx += `\n### Bede (${beds.length} stk)\n`;
      type BedRow = { name: string; area_m2: number | null; status: string; location_note: string | null; soil_notes: string | null; bed_plantings: { crop_name: string; variety: string | null; status: string; sowed_at: string | null; expected_harvest_at: string | null; companion_plants: string | null }[] };
      for (const b of (beds as unknown as BedRow[])) {
        ctx += `- ${b.name}`;
        if (b.area_m2) ctx += ` (${b.area_m2} m²)`;
        if (b.location_note) ctx += ` · ${b.location_note}`;
        ctx += ` [${b.status}]`;
        if (b.soil_notes) ctx += ` · Jord: ${b.soil_notes}`;
        const active = b.bed_plantings.filter((p) => p.status !== "fjernet");
        if (active.length > 0) {
          ctx += `\n  Plantinger: ` + active.map((p) => {
            let s = p.crop_name;
            if (p.variety) s += ` (${p.variety})`;
            if (p.status !== "planlagt") s += ` [${p.status}]`;
            if (p.expected_harvest_at) s += ` → høst ${p.expected_harvest_at}`;
            if (p.companion_plants) s += ` · naboplanter: ${p.companion_plants}`;
            return s;
          }).join(", ");
        }
        ctx += `\n`;
      }
    }

    // Polytunnel
    if (polytunnels && polytunnels.length > 0) {
      ctx += `\n### Polytunnel (${polytunnels.length} stk)\n`;
      type PTRow = { name: string; length_m: number | null; width_m: number | null; status: string; notes: string | null; polytunnel_plantings: { crop_name: string; variety: string | null; status: string; expected_harvest_at: string | null }[] };
      for (const t of (polytunnels as unknown as PTRow[])) {
        ctx += `- ${t.name}`;
        if (t.length_m && t.width_m) ctx += ` (${t.length_m}×${t.width_m} m)`;
        ctx += ` [${t.status}]`;
        if (t.notes) ctx += ` · ${t.notes}`;
        const active = t.polytunnel_plantings.filter((p) => p.status !== "fjernet");
        if (active.length > 0) {
          ctx += `\n  Plantinger: ` + active.map((p) => {
            let s = p.crop_name;
            if (p.variety) s += ` (${p.variety})`;
            if (p.status !== "planlagt") s += ` [${p.status}]`;
            if (p.expected_harvest_at) s += ` → høst ${p.expected_harvest_at}`;
            return s;
          }).join(", ");
        }
        ctx += `\n`;
      }
    }

    // Frø
    if (seeds && seeds.length > 0) {
      const MONTHS = ["", "jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
      const currentMonth = new Date().getMonth() + 1;
      ctx += `\n### Frølager (${seeds.length} typer)\n`;
      const sowableNow = seeds.filter((s) => s.sowing_from_month && s.sowing_to_month &&
        currentMonth >= s.sowing_from_month && currentMonth <= s.sowing_to_month);
      if (sowableNow.length > 0) {
        ctx += `Kan sås nu: ${sowableNow.map((s) => s.crop_name + (s.variety ? ` (${s.variety})` : "")).join(", ")}\n`;
      }
      for (const s of seeds) {
        ctx += `- ${s.crop_name}${s.variety ? ` (${s.variety})` : ""}`;
        if (s.quantity_g) ctx += ` · ${s.quantity_g}g`;
        if (s.quantity_seeds) ctx += ` · ${s.quantity_seeds} frø`;
        if (s.sowing_from_month && s.sowing_to_month) ctx += ` · såes ${MONTHS[s.sowing_from_month]}–${MONTHS[s.sowing_to_month]}`;
        if (s.best_before_year) ctx += ` · bedst før ${s.best_before_year}`;
        ctx += `\n`;
      }
    }

    // Frugtplantage
    if (fruitPlants && fruitPlants.length > 0) {
      ctx += `\n### Frugtplantage og flerårige planter (${fruitPlants.length} stk)\n`;
      for (const p of fruitPlants) {
        ctx += `- ${p.name}${p.variety ? ` (${p.variety})` : ""} [${p.plant_type ?? "ukendt"}]`;
        if (p.quantity && p.quantity > 1) ctx += ` × ${p.quantity}`;
        if (p.planted_year) ctx += ` plantet ${p.planted_year}`;
        ctx += ` [${p.status}]`;
        if (p.location_note) ctx += ` · ${p.location_note}`;
        ctx += `\n`;
      }
    }

    // Kompost
    if (compostHeaps && compostHeaps.length > 0) {
      ctx += `\n### Kompost (${compostHeaps.length} bunker)\n`;
      for (const h of compostHeaps) {
        ctx += `- ${h.name} [${h.type}] [${h.status}]`;
        if (h.ready_at) ctx += ` · klar ca. ${h.ready_at}`;
        if (h.notes) ctx += ` · ${h.notes}`;
        ctx += `\n`;
      }
    }
  }

  // Biodiversitet
  if (biodivObs && biodivObs.length > 0) {
    ctx += `\n## Biodiversitetsobservationer\n`;
    const uniqueSpecies = new Set(biodivObs.filter(o => o.species_name).map(o => o.species_name));
    ctx += `Registrerede observationer: ${biodivObs.length} · Navngivne arter: ${uniqueSpecies.size}\n`;

    // Fordeling per kategori
    const byCat: Record<string, number> = {};
    for (const o of biodivObs) byCat[o.category] = (byCat[o.category] ?? 0) + 1;
    const catStr = Object.entries(byCat).map(([k, n]) => `${k}: ${n}`).join(", ");
    ctx += `Kategorier: ${catStr}\n\n`;

    ctx += `Seneste observationer:\n`;
    for (const o of biodivObs.slice(0, 15)) {
      const fieldName = (o.field as unknown as { name: string } | null)?.name;
      ctx += `- ${o.observed_at}: ${o.category}`;
      if (o.species_name) ctx += ` — ${o.species_name}`;
      if (o.count) ctx += ` (${o.count} stk)`;
      if (fieldName) ctx += ` · ${fieldName}`;
      if (o.location_note) ctx += ` · ${o.location_note}`;
      ctx += `\n`;
    }
  }

  return ctx;
}
