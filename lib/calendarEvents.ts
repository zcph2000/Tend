import type { SupabaseClient } from "@supabase/supabase-js";
import { daysSince, getGrazingRecommendation } from "@/lib/utils";

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/**
 * Formaterer en Date som "YYYY-MM-DD" ud fra dens LOKALE kalenderdag —
 * IKKE via toISOString(), som konverterer til UTC og dermed rykker datoen
 * en dag tilbage for brugere i tidszoner foran UTC (fx Danmark).
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type CalEvent = {
  date: Date;
  /** Sat for periode-opgaver (due_date_end) — opgaven er aktiv fra `date` til og med `endDate`. */
  endDate?: Date;
  label: string;
  sub?: string;
  urgent?: boolean;
  href?: string;
  farmTaskId?: string;
  iconKind: string;
  taskType?: string | null;
  estimatedMinutes?: number | null;
};

/**
 * Henter alle kalenderbegivenheder (rotation, høst, manuelle opgaver) der er
 * relevante for et datointerval — dvs. hvis periode-opgavens span
 * [date, endDate] overlapper [rangeStart, rangeEnd]. Bruges af både måneds-
 * og dagsvisningen, så begivenhedslogikken kun findes ét sted.
 */
export async function getCalendarEvents(
  supabase: SupabaseClient,
  farmId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<CalEvent[]> {
  const today = startOfDay(new Date());
  const month = today.getMonth() + 1;
  const rangeStartStr = toISODate(rangeStart);
  const rangeEndStr = toISODate(rangeEnd);
  const events: CalEvent[] = [];

  const [{ data: activeGrazing }, { data: flockAnimals }, { data: farmTasks }, { data: upcomingHarvests }] =
    await Promise.all([
      supabase
        .from("grazing_records")
        .select("id, start_date, flock_id, flock:flocks(id,name,species), section:sections(id,name,area_ha)")
        .eq("farm_id", farmId)
        .is("end_date", null)
        .order("start_date"),
      supabase.from("animals").select("flock_id").eq("farm_id", farmId).eq("status", "active").not("flock_id", "is", null),
      supabase
        .from("farm_tasks")
        .select("id, title, notes, due_date, due_date_end, category, task_type, estimated_minutes")
        .eq("farm_id", farmId)
        .eq("status", "pending")
        .not("due_date", "is", null)
        .lte("due_date", rangeEndStr)
        .or(`due_date_end.gte.${rangeStartStr},and(due_date_end.is.null,due_date.gte.${rangeStartStr})`)
        .order("due_date"),
      supabase
        .from("bed_plantings")
        .select("id, crop_name, variety, expected_harvest_at, bed_id, beds(name)")
        .eq("farm_id", farmId)
        .not("status", "in", "(fjernet,høstet)")
        .not("expected_harvest_at", "is", null)
        .gte("expected_harvest_at", rangeStartStr)
        .lte("expected_harvest_at", rangeEndStr)
        .order("expected_harvest_at"),
    ]);

  const animalCountByFlock = (flockAnimals ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
    return acc;
  }, {});

  // Rotation — beregnet ud fra "i dag", vist kun hvis den beregnede flyttedato falder i intervallet
  for (const record of activeGrazing ?? []) {
    const flock = record.flock as unknown as { id: string; name: string; species: string | null } | null;
    const section = record.section as unknown as { id: string; name: string; area_ha: number } | null;
    if (!flock || !section) continue;

    const animalCount = animalCountByFlock[flock.id] ?? 0;
    const daysGrazing = daysSince(record.start_date);
    const rec = getGrazingRecommendation(section.area_ha, animalCount, daysGrazing, month, flock.species ?? "sheep");

    if (rec.shouldMove) {
      if (today >= rangeStart && today <= rangeEnd) {
        events.push({ date: today, label: `Flyt ${flock.name}`, sub: `${daysGrazing} dage på "${section.name}"`, urgent: true, href: "/rotation", iconKind: "rotation" });
      }
    } else {
      const startDate = startOfDay(new Date(record.start_date));
      const moveDate = addDays(startDate, rec.grazeDays);
      if (moveDate >= today && moveDate >= rangeStart && moveDate <= rangeEnd) {
        events.push({ date: moveDate, label: `Flyt ${flock.name}`, sub: `Planlagt flytning fra "${section.name}"`, href: "/rotation", iconKind: "rotation" });
      }
    }
  }

  // Høst
  for (const p of upcomingHarvests ?? []) {
    if (!p.expected_harvest_at) continue;
    const bedName = (p.beds as unknown as { name: string } | null)?.name;
    events.push({
      date: startOfDay(new Date(p.expected_harvest_at)),
      label: `Høst: ${p.crop_name}${p.variety ? ` · ${p.variety}` : ""}`,
      sub: bedName ?? undefined,
      href: `/operations/economy?planting=${p.id}`,
      iconKind: "harvest",
    });
  }

  // Manuelle/planlagte opgaver — inkl. periode-opgaver via due_date_end
  for (const t of farmTasks ?? []) {
    if (!t.due_date) continue;
    events.push({
      date: startOfDay(new Date(t.due_date)),
      endDate: t.due_date_end ? startOfDay(new Date(t.due_date_end)) : undefined,
      label: t.title,
      sub: t.notes ?? undefined,
      farmTaskId: t.id,
      iconKind: t.category ?? "andet",
      taskType: t.task_type,
      estimatedMinutes: t.estimated_minutes,
    });
  }

  return events;
}
