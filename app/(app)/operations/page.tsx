import { createClient } from "@/lib/supabase/server";
import { daysSince, getGrazingRecommendation } from "@/lib/utils";
import Link from "next/link";
import {
  RefreshCw, PawPrint, Leaf, Sprout, Calendar, CheckCircle,
  ChevronRight, Scissors, Shovel, ClipboardList, Euro, BarChart2,
} from "lucide-react";
import CheckTaskButton from "./CheckTaskButton";

const DA_DAYS   = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function formatDate(d: Date) {
  return `${DA_DAYS[d.getDay()]} ${d.getDate()}. ${DA_MONTHS[d.getMonth()]}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function daysUntil(dateStr: string, today: Date): number {
  const d = startOfDay(new Date(dateStr));
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
function fmtShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}. ${DA_MONTHS[d.getMonth()]}`;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  jordbrug: <Sprout size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#a3e635" }} />,
  dyr:      <PawPrint size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#fb923c" }} />,
  admin:    <ClipboardList size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#94a3b8" }} />,
  økonomi:  <Euro size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />,
  andet:    <Shovel size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#a8a29e" }} />,
  harvest:  <Scissors size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#a3e635" }} />,
  rotation: <RefreshCw size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#fb923c" }} />,
};

type UnifiedTask = {
  key: string;
  label: string;
  sub?: string;
  daysUntil: number;       // negative = overdue
  urgent?: boolean;
  href?: string;
  farmTaskId?: string;     // present if can be checked off
  iconKind: string;
};

export default async function DriftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("id").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const today = startOfDay(new Date());
  const month = today.getMonth() + 1;
  const lookaheadDate = addDays(today, 14).toISOString().slice(0, 10);

  const [
    { data: activeGrazing },
    { data: flockAnimals },
    { data: fields },
    { data: sections },
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
      .from("animals")
      .select("flock_id")
      .eq("farm_id", farm.id)
      .eq("status", "active")
      .not("flock_id", "is", null),
    supabase.from("fields").select("id").eq("farm_id", farm.id),
    supabase.from("sections").select("id").eq("farm_id", farm.id),
    // farm_tasks: pending, due within 14 days or overdue
    supabase
      .from("farm_tasks")
      .select("id, title, notes, due_date, timing_type, category, source_type")
      .eq("farm_id", farm.id)
      .eq("status", "pending")
      .or(`due_date.lte.${lookaheadDate},due_date.is.null`)
      .order("due_date", { nullsFirst: false }),
    // Plantinger med høst inden for 14 dage
    supabase
      .from("bed_plantings")
      .select("id, crop_name, variety, expected_harvest_at, bed_id, beds(name)")
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

  // Build unified task list
  const allTasks: UnifiedTask[] = [];

  // 1. Rotation tasks
  for (const record of activeGrazing ?? []) {
    const flock = record.flock as unknown as { id: string; name: string } | null;
    const section = record.section as unknown as { id: string; name: string; area_ha: number } | null;
    if (!flock || !section) continue;

    const animalCount = animalCountByFlock[flock.id] ?? 0;
    const daysGrazing = daysSince(record.start_date);
    const rec = getGrazingRecommendation(section.area_ha, animalCount, daysGrazing, month);

    if (rec.shouldMove) {
      allTasks.push({
        key: `rotation-${record.id}`,
        label: `Flyt ${flock.name}`,
        sub: `${daysGrazing} dage på "${section.name}" — tid til næste sektion`,
        daysUntil: 0,
        urgent: true,
        href: "/rotation",
        iconKind: "rotation",
      });
    } else {
      const startDate = startOfDay(new Date(record.start_date));
      const moveDate = addDays(startDate, rec.grazeDays);
      const du = Math.round((moveDate.getTime() - today.getTime()) / 86400000);
      if (du <= 14 && moveDate >= today) {
        allTasks.push({
          key: `rotation-planned-${record.id}`,
          label: `Flyt ${flock.name}`,
          sub: `Planlagt flytning fra "${section.name}" ${du === 0 ? "i dag" : du === 1 ? "i morgen" : `om ${du} dage`}`,
          daysUntil: du,
          href: "/rotation",
          iconKind: "rotation",
        });
      }
    }
  }

  // 2. Upcoming harvests from bed_plantings
  for (const p of upcomingHarvests ?? []) {
    if (!p.expected_harvest_at) continue;
    const du = daysUntil(p.expected_harvest_at, today);
    const bedName = (p.beds as unknown as { name: string } | null)?.name;
    allTasks.push({
      key: `harvest-${p.id}`,
      label: `Høst: ${p.crop_name}${p.variety ? ` · ${p.variety}` : ""}`,
      sub: bedName
        ? `${bedName} · ${du < 0 ? `${Math.abs(du)} dage forsinket` : du === 0 ? "i dag" : `${fmtShort(p.expected_harvest_at)}`}`
        : du === 0 ? "i dag" : du < 0 ? `${Math.abs(du)} dage forsinket` : fmtShort(p.expected_harvest_at),
      daysUntil: du,
      urgent: du <= 0,
      href: `/operations/economy?planting=${p.id}`,
      iconKind: "harvest",
    });
  }

  // 3. Manual farm_tasks
  for (const t of farmTasks ?? []) {
    const du = t.due_date ? daysUntil(t.due_date, today) : 99;
    allTasks.push({
      key: `task-${t.id}`,
      label: t.title,
      sub: t.notes
        ? t.notes
        : t.due_date
          ? (du < 0 ? `Forfald ${fmtShort(t.due_date)} — ${Math.abs(du)} dage forsinket` : du === 0 ? "I dag" : `${fmtShort(t.due_date)}`)
          : undefined,
      daysUntil: du,
      urgent: du < 0,
      farmTaskId: t.id,
      iconKind: t.category ?? "andet",
    });
  }

  // Split into today/urgent vs upcoming
  allTasks.sort((a, b) => a.daysUntil - b.daysUntil);
  const todayTasks    = allTasks.filter(t => t.daysUntil <= 0);
  const upcomingTasks = allTasks.filter(t => t.daysUntil > 0);

  const activeFlockCount = (activeGrazing ?? []).length;

  // Jordbrug status
  const { count: bedCount } = await supabase
    .from("beds").select("id", { count: "exact", head: true })
    .eq("farm_id", farm.id);
  const activePlantingCount = (upcomingHarvests ?? []).length; // proxy — harvests within 14d

  return (
    <div className="space-y-4">

      {/* ── Dagens gøremål ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-earth-50">Dagens gøremål</h2>
          <span className="text-xs text-earth-200">{formatDate(today)}</span>
        </div>

        {todayTasks.length > 0 ? (
          <div className="space-y-2">
            {todayTasks.map(task => (
              <TaskRow key={task.key} task={task} today />
            ))}
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(99,107,60,0.15)" }}>
            <CheckCircle size={20} className="text-grass-400 flex-shrink-0" style={{ color: "#a3e635" }} />
            <p className="text-sm font-medium" style={{ color: "#a3e635" }}>Alt ser godt ud i dag</p>
          </div>
        )}

        {/* Kommende opgaver (næste 14 dage) */}
        {upcomingTasks.length > 0 && (
          <div className="pt-1 border-t border-white/5">
            <p className="text-[10px] text-earth-600 uppercase tracking-widest font-semibold mb-2">Kommende</p>
            <div className="space-y-1.5">
              {upcomingTasks.map(task => (
                <TaskRow key={task.key} task={task} today={false} />
              ))}
            </div>
          </div>
        )}

        <Link href="/operations/calendar"
          className="flex items-center justify-center gap-1.5 text-xs text-earth-200 hover:text-earth-100 transition-colors pt-1">
          <Calendar size={13} />
          <span>Se kalender med alle gøremål</span>
          <ChevronRight size={13} />
        </Link>
      </div>

      {/* ── Driftsområder ── */}
      <div>
        <p className="text-xs font-semibold text-earth-200 uppercase tracking-wide px-1 mb-2">
          Hvad skal der passes?
        </p>
        <div className="space-y-3">
          {[
            {
              href: "/rotation",
              Icon: PawPrint,
              label: "Dyr & flokke",
              description: "Se aktuel placering, flyt flokke og følg genopretning.",
              status: activeFlockCount > 0
                ? `${activeFlockCount} flok${activeFlockCount !== 1 ? "ke" : ""} i rotation`
                : "Ingen flokke i rotation",
              ready: true,
            },
            {
              href: "/farming/pastures",
              Icon: Leaf,
              label: "Marker",
              description: "Afgræsningsstatus, sektioner og hegnsopsætning.",
              status: fields?.length
                ? `${fields.length} mark${fields.length !== 1 ? "er" : ""} · ${sections?.length ?? 0} sektioner`
                : "Ingen marker oprettet",
              ready: true,
            },
            {
              href: "/farming/beds",
              Icon: Sprout,
              label: "Market garden",
              description: "Bede, plantninger, såplan og høstlog.",
              status: (bedCount ?? 0) > 0
                ? `${bedCount} bede${(upcomingHarvests?.length ?? 0) > 0 ? ` · ${upcomingHarvests!.length} høst inden for 14 dage` : ""}`
                : "Ingen bede oprettet",
              ready: true,
            },
            {
              href: "/operations/economy",
              Icon: BarChart2,
              label: "Økonomi & Admin",
              description: "Udgifter, tilskud, høstlog og EU-ansøgninger.",
              status: null,
              ready: true,
            },
          ].map((area) => (
            <Link key={area.label} href={area.href}
              className="card flex items-start gap-4 hover:brightness-110 transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(99,107,60,0.20)" }}>
                <area.Icon size={20} className="text-grass-400" style={{ color: "#a3e635" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-earth-50">{area.label}</p>
                  {area.status && (
                    <span className="text-[10px] font-medium bg-earth-800 text-earth-100 rounded-full px-2 py-0.5">
                      {area.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-earth-200 mt-0.5 leading-snug">{area.description}</p>
              </div>
              <ChevronRight size={18} className="text-earth-300 group-hover:text-earth-100 transition-colors flex-shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Inline task row — server-renderable shell, check button is client ──
function TaskRow({ task, today: isToday }: { task: UnifiedTask; today: boolean }) {
  const icon = CATEGORY_ICON[task.iconKind] ?? CATEGORY_ICON.andet;

  const inner = (
    <div
      className="flex items-start gap-3 rounded-xl p-3 transition-colors"
      style={{
        background: task.urgent
          ? "rgba(196,98,42,0.10)"
          : isToday
          ? "rgba(255,255,255,0.04)"
          : "transparent",
      }}
    >
      {/* Check circle (client) or icon */}
      {task.farmTaskId ? (
        <CheckTaskButton taskId={task.farmTaskId} />
      ) : (
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${isToday ? "text-earth-50" : "text-earth-200"}`}>
          {task.label}
        </p>
        {task.sub && (
          <p className="text-xs text-earth-300 mt-0.5 leading-snug">{task.sub}</p>
        )}
      </div>

      {task.urgent && isToday && (
        <span className="text-[10px] font-semibold bg-clay-500 text-white rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5"
          style={{ background: "var(--clay, #c4622a)" }}>
          Nu
        </span>
      )}
      {!task.urgent && task.daysUntil > 0 && (
        <span className="text-[10px] text-earth-500 flex-shrink-0 mt-1">
          {task.daysUntil === 1 ? "i morgen" : `om ${task.daysUntil}d`}
        </span>
      )}
    </div>
  );

  return task.href ? (
    <Link href={task.href} className="block hover:brightness-110 transition-all">
      {inner}
    </Link>
  ) : (
    inner
  );
}
