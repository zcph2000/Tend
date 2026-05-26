import { createClient } from "@/lib/supabase/server";
import { daysSince, getGrazingRecommendation } from "@/lib/utils";
import { RefreshCw, CheckCircle, Scissors, Sprout, ClipboardList, Euro, Shovel, PawPrint } from "lucide-react";
import Link from "next/link";
import CheckTaskButton from "../CheckTaskButton";
import AddTaskForm from "./AddTaskForm";

const DA_DAYS   = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function dayLabel(d: Date, today: Date): string {
  if (isSameDay(d, today)) return "I dag";
  if (isSameDay(d, addDays(today, 1))) return "I morgen";
  return DA_DAYS[d.getDay()];
}
function fullDate(d: Date): string {
  return `${d.getDate()}. ${DA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type CalEvent = {
  date: Date;
  label: string;
  sub?: string;
  urgent?: boolean;
  href?: string;
  farmTaskId?: string;
  iconKind?: string;
};

const ICON: Record<string, React.ReactNode> = {
  jordbrug: <Sprout size={14} style={{ color: "#a3e635" }} />,
  harvest:  <Scissors size={14} style={{ color: "#a3e635" }} />,
  dyr:      <PawPrint size={14} style={{ color: "#fb923c" }} />,
  rotation: <RefreshCw size={14} style={{ color: "#fb923c" }} />,
  admin:    <ClipboardList size={14} style={{ color: "#94a3b8" }} />,
  økonomi:  <Euro size={14} style={{ color: "#fbbf24" }} />,
  andet:    <Shovel size={14} style={{ color: "#a8a29e" }} />,
};

export default async function KalenderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  const today = startOfDay(new Date());
  const month = new Date().getMonth() + 1;
  const events: CalEvent[] = [];
  const farmId = farm?.id ?? "";

  if (farm) {
    const lookaheadDate = addDays(today, 30).toISOString().slice(0, 10);

    const [
      { data: activeGrazing },
      { data: flockAnimals },
      { data: farmTasks },
      { data: upcomingHarvests },
    ] = await Promise.all([
      supabase
        .from("grazing_records")
        .select("id, start_date, flock_id, flock:flocks(id,name), section:sections(id,name,area_ha)")
        .eq("farm_id", farm.id)
        .is("end_date", null)
        .order("start_date"),
      supabase
        .from("animals").select("flock_id")
        .eq("farm_id", farm.id).eq("status", "active")
        .not("flock_id", "is", null),
      supabase
        .from("farm_tasks")
        .select("id, title, notes, due_date, category")
        .eq("farm_id", farm.id)
        .eq("status", "pending")
        .not("due_date", "is", null)
        .lte("due_date", lookaheadDate)
        .order("due_date"),
      supabase
        .from("bed_plantings")
        .select("id, crop_name, variety, expected_harvest_at, beds(name)")
        .eq("farm_id", farm.id)
        .not("status", "in", "(fjernet,høstet)")
        .not("expected_harvest_at", "is", null)
        .lte("expected_harvest_at", lookaheadDate)
        .order("expected_harvest_at"),
    ]);

    const animalCountByFlock = (flockAnimals ?? []).reduce<Record<string, number>>((acc, a) => {
      if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
      return acc;
    }, {});

    // Rotation events
    for (const record of activeGrazing ?? []) {
      const flock = record.flock as unknown as { id: string; name: string } | null;
      const section = record.section as unknown as { id: string; name: string; area_ha: number } | null;
      if (!flock || !section) continue;

      const animalCount = animalCountByFlock[flock.id] ?? 0;
      const daysGrazing = daysSince(record.start_date);
      const rec = getGrazingRecommendation(section.area_ha, animalCount, daysGrazing, month);

      if (rec.shouldMove) {
        events.push({ date: today, label: `Flyt ${flock.name}`, sub: `${daysGrazing} dage på "${section.name}"`, urgent: true, href: "/rotation", iconKind: "rotation" });
      } else {
        const startDate = startOfDay(new Date(record.start_date));
        const moveDate = addDays(startDate, rec.grazeDays);
        if (moveDate >= today) {
          events.push({ date: moveDate, label: `Flyt ${flock.name}`, sub: `Planlagt flytning fra "${section.name}"`, href: "/rotation", iconKind: "rotation" });
        }
      }
    }

    // Harvest events
    for (const p of upcomingHarvests ?? []) {
      if (!p.expected_harvest_at) continue;
      const bedName = (p.beds as unknown as { name: string } | null)?.name;
      events.push({
        date: startOfDay(new Date(p.expected_harvest_at)),
        label: `Høst: ${p.crop_name}${p.variety ? ` · ${p.variety}` : ""}`,
        sub: bedName ?? undefined,
        href: "/jordbrug/bede",
        iconKind: "harvest",
      });
    }

    // Manual farm_tasks
    for (const t of farmTasks ?? []) {
      if (!t.due_date) continue;
      events.push({
        date: startOfDay(new Date(t.due_date)),
        label: t.title,
        sub: t.notes ?? undefined,
        farmTaskId: t.id,
        iconKind: t.category ?? "andet",
      });
    }
  }

  const DAYS_BACK    = 3;
  const DAYS_FORWARD = 27;
  const days: Date[] = Array.from({ length: DAYS_BACK + 1 + DAYS_FORWARD }, (_, i) =>
    startOfDay(addDays(today, i - DAYS_BACK))
  );

  function eventsForDay(d: Date): CalEvent[] {
    return events.filter(e => isSameDay(e.date, d));
  }

  return (
    <div className="space-y-2 pb-4">

      {days.map((day, idx) => {
        const isToday  = isSameDay(day, today);
        const isPast   = day < today;
        const dayEvts  = eventsForDay(day);
        const hasEvts  = dayEvts.length > 0;

        if (isPast && !hasEvts) return null;

        return (
          <div key={idx}>
            {isToday ? (
              /* ── I DAG ── */
              <div className="card border-2 space-y-3" style={{ borderColor: "rgba(196,98,42,0.4)" }}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#a3e635" }}>I dag</p>
                    <p className="font-bold text-earth-50 text-lg leading-none mt-0.5">{fullDate(day)}</p>
                  </div>
                  {hasEvts && (
                    <span className="text-xs bg-earth-800 text-earth-100 font-medium rounded-full px-2 py-0.5">
                      {dayEvts.length} opgave{dayEvts.length !== 1 ? "r" : ""}
                    </span>
                  )}
                </div>

                {hasEvts ? (
                  <div className="space-y-2">
                    {dayEvts.map((ev, i) => (
                      <CalEventRow key={i} ev={ev} prominent />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(99,107,60,0.15)" }}>
                    <CheckCircle size={18} style={{ color: "#a3e635" }} className="flex-shrink-0" />
                    <p className="text-sm font-medium" style={{ color: "#a3e635" }}>Ingen akutte opgaver</p>
                  </div>
                )}

                {/* Tilføj opgave */}
                <AddTaskForm farmId={farmId} defaultDate={today.toISOString().slice(0, 10)} />
              </div>
            ) : (
              /* ── Fremtidige / fortid dage ── */
              <div className={`rounded-xl px-4 py-3 space-y-2 ${
                isPast ? "opacity-60" : "border border-white/10"
              }`} style={{ background: isPast ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)" }}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-earth-200">
                    {dayLabel(day, today)}
                    <span className="font-normal text-earth-300 ml-1.5">
                      {day.getDate()}. {DA_MONTHS[day.getMonth()]}
                    </span>
                  </p>
                </div>
                {hasEvts && (
                  <div className="space-y-1.5">
                    {dayEvts.map((ev, i) => (
                      <CalEventRow key={i} ev={ev} prominent={false} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CalEventRow({ ev, prominent }: { ev: CalEvent; prominent: boolean }) {
  const icon = ICON[ev.iconKind ?? "andet"] ?? ICON.andet;
  const inner = (
    <div
      className="flex items-start gap-2.5 rounded-xl transition-colors"
      style={{ padding: prominent ? "10px 12px" : "4px 0", background: prominent ? (ev.urgent ? "rgba(196,98,42,0.10)" : "rgba(255,255,255,0.04)") : "transparent" }}
    >
      {ev.farmTaskId ? (
        <CheckTaskButton taskId={ev.farmTaskId} />
      ) : (
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className={`${prominent ? "text-sm font-semibold text-earth-50" : "text-xs font-medium text-earth-100"} leading-tight`}>
          {ev.label}
        </p>
        {ev.sub && (
          <p className={prominent ? "text-xs text-earth-300 mt-0.5" : "text-[10px] text-earth-400"}>
            {ev.sub}
          </p>
        )}
      </div>
      {ev.urgent && prominent && (
        <span className="text-[10px] font-semibold text-white rounded-full px-2 py-0.5 flex-shrink-0"
          style={{ background: "var(--clay, #c4622a)" }}>
          Nu
        </span>
      )}
    </div>
  );

  return ev.href ? (
    <Link href={ev.href} className="block hover:brightness-110 transition-all">{inner}</Link>
  ) : inner;
}
