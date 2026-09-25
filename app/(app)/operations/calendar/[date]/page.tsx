import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft, CheckCircle, RefreshCw, Scissors, Sprout, ClipboardList, Euro, Shovel, PawPrint } from "lucide-react";
import { getCalendarEvents, startOfDay, addDays, isSameDay, toISODate, type CalEvent } from "@/lib/calendarEvents";
import CheckTaskButton from "../../CheckTaskButton";
import AddTaskForm from "../AddTaskForm";

const DA_DAYS   = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function fullDate(d: Date): string {
  return `${DA_DAYS[d.getDay()]} ${d.getDate()}. ${DA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function monthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function parseISODate(s: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const ICON: Record<string, React.ReactNode> = {
  jordbrug: <Sprout size={14} style={{ color: "#a3e635" }} />,
  harvest:  <Scissors size={14} style={{ color: "#a3e635" }} />,
  dyr:      <PawPrint size={14} style={{ color: "#fb923c" }} />,
  rotation: <RefreshCw size={14} style={{ color: "#fb923c" }} />,
  admin:    <ClipboardList size={14} style={{ color: "#94a3b8" }} />,
  økonomi:  <Euro size={14} style={{ color: "#fbbf24" }} />,
  andet:    <Shovel size={14} style={{ color: "#a8a29e" }} />,
};

export default async function CalendarDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
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

  const day = startOfDay(parseISODate(date) ?? new Date());
  const today = startOfDay(new Date());
  const isToday = isSameDay(day, today);
  const prevDay = addDays(day, -1);
  const nextDay = addDays(day, 1);

  const events = await getCalendarEvents(supabase, farm.id, day, day);

  return (
    <div className="space-y-3 pb-4">
      <Link href={`/operations/calendar?m=${monthParam(day)}`} className="flex items-center gap-1.5 text-xs text-earth-300 hover:text-earth-100 transition-colors">
        <ArrowLeft size={13} />
        Måned
      </Link>

      <div className="flex items-center justify-between">
        <Link href={`/operations/calendar/${toISODate(prevDay)}`} className="btn-secondary p-2" aria-label="Forrige dag">
          <ChevronLeft size={16} />
        </Link>
        <div className="text-center">
          {isToday && <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#a3e635" }}>I dag</p>}
          <p className="font-bold text-earth-50 leading-none mt-0.5">{fullDate(day)}</p>
          {!isToday && (
            <Link href={`/operations/calendar/${toISODate(today)}`} className="text-xs text-earth-300 hover:text-earth-100">I dag</Link>
          )}
        </div>
        <Link href={`/operations/calendar/${toISODate(nextDay)}`} className="btn-secondary p-2" aria-label="Næste dag">
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="card space-y-3">
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((ev, i) => (
              <CalEventRow key={i} ev={ev} day={day} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(99,107,60,0.15)" }}>
            <CheckCircle size={18} style={{ color: "#a3e635" }} className="flex-shrink-0" />
            <p className="text-sm font-medium" style={{ color: "#a3e635" }}>Ingen opgaver denne dag</p>
          </div>
        )}

        <AddTaskForm farmId={farm.id} defaultDate={toISODate(day)} />
      </div>
    </div>
  );
}

function CalEventRow({ ev, day }: { ev: CalEvent; day: Date }) {
  const icon = ICON[ev.iconKind ?? "andet"] ?? ICON.andet;
  const isRange = !!ev.endDate && !isSameDay(ev.date, ev.endDate);
  const dayNumber = isRange ? daysBetween(ev.date, day) + 1 : null;
  const totalDays = isRange ? daysBetween(ev.date, ev.endDate!) + 1 : null;

  const inner = (
    <div
      className="flex items-start gap-2.5 rounded-xl transition-colors p-2.5"
      style={{ background: ev.urgent ? "rgba(196,98,42,0.10)" : "rgba(255,255,255,0.04)" }}
    >
      {ev.farmTaskId ? (
        <CheckTaskButton taskId={ev.farmTaskId} taskType={ev.taskType} estimatedMinutes={ev.estimatedMinutes} />
      ) : (
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-earth-50 leading-tight">{ev.label}</p>
        {(ev.sub || ev.estimatedMinutes || isRange) && (
          <p className="text-xs text-earth-300 mt-0.5">
            {isRange && `Dag ${dayNumber} af ${totalDays}`}
            {isRange && (ev.sub || ev.estimatedMinutes) ? " · " : ""}
            {ev.sub}
            {ev.sub && ev.estimatedMinutes ? " · " : ""}
            {ev.estimatedMinutes ? `~${ev.estimatedMinutes} min` : ""}
          </p>
        )}
      </div>
      {ev.urgent && (
        <span className="text-[10px] font-semibold text-white rounded-full px-2 py-0.5 flex-shrink-0" style={{ background: "var(--clay, #c4622a)" }}>
          Nu
        </span>
      )}
    </div>
  );

  return ev.href ? <Link href={ev.href} className="block hover:brightness-110 transition-all">{inner}</Link> : inner;
}
