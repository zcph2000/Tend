import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sprout, Scissors, PawPrint, RefreshCw, ClipboardList, Euro, Shovel } from "lucide-react";
import { getCalendarEvents, startOfDay, addDays, isSameDay, toISODate, type CalEvent } from "@/lib/calendarEvents";
import AddTaskForm from "./AddTaskForm";
import PrintButton from "./PrintButton";

const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];
const DA_WEEKDAYS_SHORT = ["Man","Tir","Ons","Tor","Fre","Lør","Søn"];

const DOT_COLOR: Record<string, string> = {
  jordbrug: "#a3e635",
  harvest:  "#a3e635",
  dyr:      "#fb923c",
  rotation: "#fb923c",
  admin:    "#94a3b8",
  økonomi:  "#fbbf24",
  andet:    "#a8a29e",
};

const ICON: Record<string, React.ReactNode> = {
  jordbrug: <Sprout size={11} />,
  harvest:  <Scissors size={11} />,
  dyr:      <PawPrint size={11} />,
  rotation: <RefreshCw size={11} />,
  admin:    <ClipboardList size={11} />,
  økonomi:  <Euro size={11} />,
  andet:    <Shovel size={11} />,
};

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7; // 0=mandag ... 6=søndag
}
function parseMonthParam(m: string | undefined): Date {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function monthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Bar = { event: CalEvent; startCol: number; endCol: number; lane: number; continuesLeft: boolean; continuesRight: boolean };

function layoutBarsForWeek(weekStart: Date, rangeEvents: CalEvent[]): { bars: Bar[]; laneCount: number } {
  const weekEnd = addDays(weekStart, 6);
  const relevant = rangeEvents
    .filter((e) => e.endDate! >= weekStart && e.date <= weekEnd)
    .map((e) => {
      const start = e.date < weekStart ? weekStart : e.date;
      const end = e.endDate! > weekEnd ? weekEnd : e.endDate!;
      return {
        event: e,
        startCol: Math.round((start.getTime() - weekStart.getTime()) / 86400000),
        endCol: Math.round((end.getTime() - weekStart.getTime()) / 86400000),
        continuesLeft: e.date < weekStart,
        continuesRight: e.endDate! > weekEnd,
      };
    })
    .sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);

  const laneEnds: number[] = [];
  const bars: Bar[] = [];
  for (const r of relevant) {
    let lane = laneEnds.findIndex((end) => end < r.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(r.endCol);
    } else {
      laneEnds[lane] = r.endCol;
    }
    bars.push({ ...r, lane });
  }
  return { bars, laneCount: laneEnds.length };
}

export default async function KalenderPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const today = startOfDay(new Date());
  const monthStart = parseMonthParam(m);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const gridStart = addDays(monthStart, -mondayIndex(monthStart));
  const daysNeeded = mondayIndex(monthStart) + monthEnd.getDate();
  const numWeeks = Math.ceil(daysNeeded / 7);
  const gridEnd = addDays(gridStart, numWeeks * 7 - 1);

  const events = await getCalendarEvents(supabase, farm.id, gridStart, gridEnd);
  const pointEvents = events.filter((e) => !e.endDate || isSameDay(e.date, e.endDate));
  const rangeEvents = events.filter((e) => e.endDate && !isSameDay(e.date, e.endDate));

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const isCurrentMonth = monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth();

  // Én samlet grid for hele måneden (i stedet for én pr. uge) — så kolonnelinjerne
  // altid flugter pixel-præcist ned gennem hele kalenderen, uanset at ugerne har
  // forskelligt antal periode-bjælke-"lanes" og dermed forskellig rækkehøjde.
  const weeks: Date[][] = [];
  const weekLayouts: { bars: Bar[]; laneCount: number; startRow: number }[] = [];
  let rowCursor = 1; // række 1 er ugedagsoverskrifterne
  for (let w = 0; w < numWeeks; w++) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i));
    weeks.push(week);
    const { bars, laneCount } = layoutBarsForWeek(week[0], rangeEvents);
    weekLayouts.push({ bars, laneCount, startRow: rowCursor + 1 });
    rowCursor += 1 + laneCount;
  }
  const rowTracks = ["auto"];
  for (const wl of weekLayouts) {
    rowTracks.push("auto");
    for (let i = 0; i < wl.laneCount; i++) rowTracks.push("var(--cal-lane-h)");
  }

  return (
    <div id="month-view" className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <Link href={`/operations/calendar?m=${monthParam(prevMonth)}`} className="btn-secondary p-2 no-print" aria-label="Forrige måned">
          <ChevronLeft size={16} />
        </Link>
        <div className="text-center">
          <p className="font-bold text-earth-50 text-xl leading-none">{DA_MONTHS[monthStart.getMonth()]} {monthStart.getFullYear()}</p>
          {!isCurrentMonth && (
            <Link href={`/operations/calendar`} className="text-xs text-earth-300 hover:text-earth-100 no-print">I dag</Link>
          )}
        </div>
        <Link href={`/operations/calendar?m=${monthParam(nextMonth)}`} className="btn-secondary p-2 no-print" aria-label="Næste måned">
          <ChevronRight size={16} />
        </Link>
      </div>

      <div
        className="grid rounded-2xl overflow-hidden print-surface"
        style={{
          gridTemplateColumns: "repeat(7,1fr)",
          gridTemplateRows: rowTracks.join(" "),
          background: "var(--surface)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {DA_WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} style={{ gridColumn: i + 1, gridRow: 1 }} className="text-center text-xs font-semibold text-earth-400 py-2 print-text-muted">
            {d}
          </div>
        ))}

        {weekLayouts.map((wl, wi) => (
          <div key={wi} style={{ display: "contents" }}>
            {weeks[wi].map((day, di) => {
              const inMonth = day.getMonth() === monthStart.getMonth();
              const isToday = isSameDay(day, today);
              const dayPointEvents = pointEvents.filter((e) => isSameDay(e.date, day));
              return (
                <Link
                  key={di}
                  href={`/operations/calendar/${toISODate(day)}`}
                  style={{
                    gridColumn: di + 1,
                    gridRow: `${wl.startRow} / span ${1 + wl.laneCount}`,
                    minHeight: "var(--cal-day-min-h)",
                    borderTop: wi > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                  }}
                  className={`flex flex-col gap-1 px-1.5 pt-1.5 pb-2 hover:brightness-125 transition-all print-border ${di < 6 ? "border-r" : ""}`}
                  aria-label={toISODate(day)}
                >
                  <span
                    className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      color: inMonth ? (isToday ? "#fff" : "var(--text)") : "var(--text-subtle)",
                      background: isToday ? "var(--clay, #c4622a)" : "transparent",
                      opacity: inMonth ? 1 : 0.4,
                    }}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayPointEvents.slice(0, 3).map((ev, i) => (
                      <span key={i} className="flex items-center gap-1 text-[10px] leading-tight truncate" style={{ color: DOT_COLOR[ev.iconKind] ?? "#a8a29e" }}>
                        <span className="flex-shrink-0">{ICON[ev.iconKind] ?? ICON.andet}</span>
                        <span className="truncate print-text">{ev.label}</span>
                      </span>
                    ))}
                    {dayPointEvents.length > 3 && (
                      <span className="text-[10px] text-earth-500">+{dayPointEvents.length - 3} mere</span>
                    )}
                  </div>
                </Link>
              );
            })}

            {wl.bars.map((bar, bi) => (
              <Link
                key={bi}
                href={`/operations/calendar/${toISODate(bar.event.date)}`}
                style={{
                  gridColumnStart: bar.startCol + 1,
                  gridColumnEnd: bar.endCol + 2,
                  gridRow: wl.startRow + 1 + bar.lane,
                  background: DOT_COLOR[bar.event.iconKind] ?? "#a8a29e",
                  marginLeft: bar.continuesLeft ? 0 : 2,
                  marginRight: bar.continuesRight ? 0 : 2,
                  borderTopLeftRadius: bar.continuesLeft ? 0 : 4,
                  borderBottomLeftRadius: bar.continuesLeft ? 0 : 4,
                  borderTopRightRadius: bar.continuesRight ? 0 : 4,
                  borderBottomRightRadius: bar.continuesRight ? 0 : 4,
                }}
                className="text-[10px] text-white font-medium px-1.5 flex items-center truncate hover:brightness-110 transition-all"
                title={bar.event.label}
              >
                {!bar.continuesLeft && bar.event.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 no-print">
        <PrintButton />
      </div>

      <div className="no-print">
        <AddTaskForm farmId={farm.id} defaultDate={toISODate(today)} />
      </div>
    </div>
  );
}
