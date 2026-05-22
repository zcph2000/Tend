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

export async function buildFarmContext(
  supabase: SupabaseClient,
  farmId: string
): Promise<string> {
  const [
    { data: farm },
    { data: fields },
    { data: animals },
    { data: flocks },
    { data: activeGrazing },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from("farms").select("*").eq("id", farmId).single(),
    supabase.from("fields").select("*, sections(*)").eq("farm_id", farmId),
    supabase
      .from("animals")
      .select("*")
      .eq("farm_id", farmId)
      .eq("status", "active"),
    supabase.from("flocks").select("*").eq("farm_id", farmId),
    supabase
      .from("grazing_records")
      .select(
        "*, flock:flocks(name), section:sections(name, area_ha, field:fields(name))"
      )
      .eq("farm_id", farmId)
      .is("end_date", null),
    supabase
      .from("animal_events")
      .select("*, animal:animals(ear_tag, name)")
      .eq("farm_id", farmId)
      .order("event_date", { ascending: false })
      .limit(15),
  ]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("da-DK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let ctx = `# Gårdsdata — ${farm?.name ?? "Ukendt gård"}\n`;
  ctx += `Dato: ${dateStr}\n\n`;

  // Gårdsprofil
  if (farm?.profile) {
    ctx += `## Gårdens profil og intentioner\n${farm.profile}\n\n`;
  }

  // Marker og sektioner
  ctx += `## Marker og sektioner\n`;
  const totalArea = (fields ?? []).reduce(
    (sum, f) => sum + (f.area_ha ?? 0),
    0
  );
  ctx += `Samlet areal: ${totalArea.toFixed(1)} ha fordelt på ${fields?.length ?? 0} marker\n\n`;

  for (const field of fields ?? []) {
    ctx += `### ${field.name} (${field.area_ha} ha)`;
    if (field.notes) ctx += `\n${field.notes}`;
    ctx += `\nSektioner:\n`;

    type SectionRow = {
      name: string;
      area_ha: number;
      purpose?: string | null;
      notes?: string | null;
    };

    for (const section of (field.sections ?? []) as SectionRow[]) {
      ctx += `  - ${section.name}: ${section.area_ha} ha`;
      if (section.purpose) ctx += ` [${purposeSectionDa(section.purpose)}]`;
      if (section.notes) ctx += ` — ${section.notes}`;
      ctx += `\n`;
    }
  }

  // Besætning
  ctx += `\n## Besætning\n`;
  const activeAnimals = animals ?? [];
  const females = activeAnimals.filter((a) => a.sex === "female").length;
  const males = activeAnimals.filter((a) => a.sex === "male").length;
  const castrated = activeAnimals.filter((a) => a.sex === "castrated").length;
  ctx += `Total aktive dyr: ${activeAnimals.length} (${females} hunner, ${males} hanner, ${castrated} kastrerede)\n`;

  // Gruppér efter formål
  const byPurpose: Record<string, typeof activeAnimals> = {};
  for (const a of activeAnimals) {
    const p = (a.purpose as string | null) ?? "uspecificeret";
    byPurpose[p] = [...(byPurpose[p] ?? []), a];
  }

  for (const [purpose, group] of Object.entries(byPurpose)) {
    ctx += `\n**${purposeAnimalDa(purpose)}**: ${group.length} dyr\n`;
    const withNotes = group.filter((a) => a.notes);
    if (withNotes.length > 0) {
      for (const a of withNotes) {
        ctx += `  - ${a.name ?? a.ear_tag}: ${a.notes}\n`;
      }
    }
  }

  // Flokke
  if (flocks && flocks.length > 0) {
    ctx += `\n## Flokke\n`;
    for (const flock of flocks) {
      const count = activeAnimals.filter(
        (a) => a.flock_id === flock.id
      ).length;
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
      const section = record.section as {
        name: string;
        area_ha: number;
        field: { name: string } | null;
      } | null;
      const days = Math.floor(
        (today.getTime() - new Date(record.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      ctx += `- ${flock?.name ?? "Flok"} er på ${section?.field?.name ?? ""} / ${section?.name ?? "Sektion"} (${section?.area_ha ?? "?"} ha) — dag ${days} af rotation\n`;
    }
  }

  // Seneste hændelser
  if (recentEvents && recentEvents.length > 0) {
    ctx += `\n## Seneste hændelser\n`;
    for (const ev of recentEvents) {
      const animal = ev.animal as {
        ear_tag: string;
        name: string | null;
      } | null;
      ctx += `- ${ev.event_date}: ${eventTypeDa(ev.event_type)} — ${animal?.name ?? animal?.ear_tag ?? "Ukendt"}`;
      if (ev.notes) ctx += ` (${ev.notes})`;
      ctx += `\n`;
    }
  }

  return ctx;
}
