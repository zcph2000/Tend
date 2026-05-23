import { SupabaseClient } from "@supabase/supabase-js";

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
    { data: recentEvents },
    { data: soilObs },
    { data: biodivObs },
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
  ]);

  const dateStr = today.toLocaleDateString("da-DK", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  let ctx = `# Gårdsdata — ${farm?.name ?? "Ukendt gård"}\n`;
  ctx += `Dato: ${dateStr}\n`;
  ctx += `Sæson: ${seasonDa(month)}\n\n`;

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
