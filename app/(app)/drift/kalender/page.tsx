import { createClient } from "@/lib/supabase/server";
import { daysSince, getGrazingRecommendation } from "@/lib/utils";
import { RefreshCw, CheckCircle } from "lucide-react";

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
};

export default async function KalenderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  const today = startOfDay(new Date());
  const month = new Date().getMonth() + 1;
  const events: CalEvent[] = [];

  if (farm) {
    const [{ data: activeGrazing }, { data: flockAnimals }] = await Promise.all([
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
    ]);

    const animalCountByFlock = (flockAnimals ?? []).reduce<Record<string, number>>((acc, a) => {
      if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
      return acc;
    }, {});

    for (const record of activeGrazing ?? []) {
      const flock = record.flock as unknown as { id: string; name: string } | null;
      const section = record.section as unknown as { id: string; name: string; area_ha: number } | null;
      if (!flock || !section) continue;

      const animalCount = animalCountByFlock[flock.id] ?? 0;
      const daysGrazing = daysSince(record.start_date);
      const rec = getGrazingRecommendation(section.area_ha, animalCount, daysGrazing, month);

      if (rec.shouldMove) {
        events.push({
          date: today,
          label: `Flyt ${flock.name}`,
          sub: `${daysGrazing} dage på "${section.name}"`,
          urgent: true,
          href: "/rotation",
        });
      } else {
        const startDate = startOfDay(new Date(record.start_date));
        const moveDate = addDays(startDate, rec.grazeDays);
        if (moveDate >= today) {
          events.push({
            date: moveDate,
            label: `Flyt ${flock.name}`,
            sub: `Planlagt flytning fra "${section.name}"`,
            href: "/rotation",
          });
        }
      }
    }
  }

  const DAYS_BACK = 3;
  const DAYS_FORWARD = 17;
  const days: Date[] = Array.from({ length: DAYS_BACK + 1 + DAYS_FORWARD }, (_, i) =>
    startOfDay(addDays(today, i - DAYS_BACK))
  );

  function eventsForDay(d: Date): CalEvent[] {
    return events.filter(e => isSameDay(e.date, d));
  }

  return (
    <div className="space-y-2 pb-4">

      {days.map((day, idx) => {
        const isToday = isSameDay(day, today);
        const isPast = day < today;
        const dayEvents = eventsForDay(day);
        const hasEvents = dayEvents.length > 0;

        if (isPast && !hasEvents) return null;

        return (
          <div key={idx}>
            {isToday ? (
              /* ── I DAG — stor og fremtrædende ── */
              <div className="card border-2 border-clay-500/40 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-semibold text-grass-400 uppercase tracking-wide">I dag</p>
                    <p className="font-bold text-earth-50 text-lg leading-none mt-0.5">{fullDate(day)}</p>
                  </div>
                  {hasEvents && (
                    <span className="text-xs bg-earth-800 text-earth-100 font-medium rounded-full px-2 py-0.5">
                      {dayEvents.length} opgave{dayEvents.length !== 1 ? "r" : ""}
                    </span>
                  )}
                </div>

                {hasEvents ? (
                  <div className="space-y-2">
                    {dayEvents.map((ev, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(196,98,42,0.10)" }}>
                        <RefreshCw size={18} className="flex-shrink-0 mt-0.5 text-clay-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-earth-50">{ev.label}</p>
                          {ev.sub && <p className="text-xs text-earth-300 mt-0.5">{ev.sub}</p>}
                        </div>
                        {ev.urgent && (
                          <span className="text-[10px] font-semibold bg-clay-500 text-white rounded-full px-2 py-0.5 flex-shrink-0">
                            Nu
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(99,107,60,0.15)" }}>
                    <CheckCircle size={18} className="text-grass-400 flex-shrink-0" />
                    <p className="text-sm text-grass-400 font-medium">Ingen akutte opgaver</p>
                  </div>
                )}

                <button disabled
                  className="w-full py-2 rounded-xl border-2 border-dashed border-earth-700 text-xs text-earth-300 cursor-default">
                  + Tilføj opgave (kommer snart)
                </button>
              </div>
            ) : (
              /* ── Fremtidige / fortid dage — kompakte ── */
              <div className={`rounded-xl px-4 py-3 space-y-2 ${
                isPast ? "opacity-60 bg-earth-800/40" : "bg-earth-800/60 border border-white/10"
              }`}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-earth-200">
                    {dayLabel(day, today)}
                    <span className="font-normal text-earth-300 ml-1.5">
                      {day.getDate()}. {DA_MONTHS[day.getMonth()]}
                    </span>
                  </p>
                </div>

                {hasEvents && (
                  <div className="space-y-1.5">
                    {dayEvents.map((ev, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <RefreshCw size={14} className="flex-shrink-0 text-earth-200" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-earth-100 leading-tight">{ev.label}</p>
                          {ev.sub && <p className="text-[10px] text-earth-300">{ev.sub}</p>}
                        </div>
                      </div>
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
