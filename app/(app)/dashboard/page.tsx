import { createClient } from "@/lib/supabase/server";
import { getWeather, weatherIcon } from "@/lib/weather";
import { daysSince, getGrazingRecommendation } from "@/lib/utils";
import Link from "next/link";

const DA_DAYS   = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
const DA_MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function todayLabel() {
  const d = new Date();
  return `${DA_DAYS[d.getDay()]} ${d.getDate()}. ${DA_MONTHS[d.getMonth()]}`;
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}. ${DA_MONTHS[d.getMonth()]}`;
}

function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    vaccination: "💉", worming: "💊", tupping: "🐏",
    lambing: "🐑", weighing: "⚖️", treatment: "🏥",
    observation: "👁️", note: "📝",
  };
  return icons[type] ?? "📋";
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    vaccination: "Vaccination", worming: "Ormekur", tupping: "Sat til vædder",
    lambing: "Lammede", weighing: "Vejet", treatment: "Behandling",
    observation: "Observation", note: "Note",
  };
  return labels[type] ?? type;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: farm } = await supabase
    .from("farms").select("*").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">🌱</div>
          <h2 className="font-semibold text-earth-900 text-lg mb-2">Velkommen til Tend</h2>
          <p className="text-earth-500 text-sm mb-4">Start med at oprette din gård</p>
          <Link href="/settings" className="btn-primary inline-block">Opret gård</Link>
        </div>
      </div>
    );
  }

  const month = new Date().getMonth() + 1;

  const [
    { data: activeGrazing },
    { data: flockAnimals },
    { data: animalEvents },
    { data: recentMoves },
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
      .from("animal_events")
      .select("id, event_type, event_date, animal:animals(ear_tag, name)")
      .eq("farm_id", farm.id)
      .order("event_date", { ascending: false })
      .limit(8),
    supabase
      .from("grazing_records")
      .select("id, end_date, flock:flocks(name), section:sections(name)")
      .eq("farm_id", farm.id)
      .not("end_date", "is", null)
      .order("end_date", { ascending: false })
      .limit(5),
  ]);

  // ── Dagens opgaver ──
  const animalCountByFlock = (flockAnimals ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
    return acc;
  }, {});

  type Task = { icon: string; label: string; sub: string; urgent: boolean };
  const tasks: Task[] = [];

  for (const record of activeGrazing ?? []) {
    const flock = record.flock as unknown as { id: string; name: string } | null;
    const section = record.section as unknown as { id: string; name: string; area_ha: number } | null;
    if (!flock || !section) continue;

    const animalCount = animalCountByFlock[flock.id] ?? 0;
    const daysGrazing = daysSince(record.start_date);
    const rec = getGrazingRecommendation(section.area_ha, animalCount, daysGrazing, month);

    if (rec.shouldMove) {
      tasks.push({
        icon: "🔄",
        label: `Flyt ${flock.name}`,
        sub: `${daysGrazing} dage på "${section.name}"`,
        urgent: true,
      });
    }
  }

  // ── Kombineret aktivitetsfeed ──
  type Activity = { id: string; date: string; icon: string; label: string; sub: string; href: string };
  const activities: Activity[] = [];

  for (const ev of animalEvents ?? []) {
    const animal = ev.animal as unknown as { ear_tag: string; name: string | null } | null;
    activities.push({
      id: `ae-${ev.id}`,
      date: ev.event_date,
      icon: eventIcon(ev.event_type),
      label: eventLabel(ev.event_type),
      sub: animal?.name ?? animal?.ear_tag ?? "—",
      href: "/animals",
    });
  }

  for (const move of recentMoves ?? []) {
    if (!move.end_date) continue;
    const flock = move.flock as unknown as { name: string } | null;
    const section = move.section as unknown as { name: string } | null;
    activities.push({
      id: `gr-${move.id}`,
      date: move.end_date,
      icon: "🔄",
      label: "Flytning",
      sub: `${flock?.name ?? "Flok"} → ${section?.name ?? "Sektion"}`,
      href: "/rotation",
    });
  }

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const topActivities = activities.slice(0, 6);

  // ── Vejr ──
  let weather = null;
  let forecast: Awaited<ReturnType<typeof getWeather>> = [];
  try {
    const weatherData = await getWeather(farm.lat ?? 55.75, farm.lng ?? 11.0);
    weather = weatherData[0];
    forecast = weatherData.slice(1, 6);
  } catch {
    // silent
  }

  return (
    <div className="space-y-4">

      {/* ── Gård + dato + vejr ── */}
      <div className="card bg-gradient-to-br from-grass-600 to-grass-800 text-white border-0">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-grass-200 text-xs font-medium uppercase tracking-wide">
              {todayLabel()}
            </p>
            <h1 className="text-2xl font-bold mt-0.5">{farm.name}</h1>
            {farm.location && (
              <p className="text-grass-300 text-sm mt-0.5">{farm.location}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl">{weather ? weatherIcon(weather.weather_code) : "🌤️"}</p>
            {weather && (
              <>
                <p className="text-white font-bold text-lg leading-none mt-1">
                  {Math.round(weather.temp_mean)}°C
                </p>
                <p className="text-grass-300 text-xs mt-0.5">
                  {Math.round(weather.temp_min)}° / {Math.round(weather.temp_max)}°
                </p>
              </>
            )}
          </div>
        </div>
        {weather && (
          <div className="mt-3 pt-3 border-t border-grass-500 flex gap-4 text-sm">
            <span className="text-grass-200">🌧️ {weather.precipitation} mm</span>
            <span className="text-grass-200">💨 {Math.round(weather.wind_speed)} km/t</span>
          </div>
        )}
      </div>

      {/* ── Dagens opgaver ── */}
      <div className={`card space-y-2 ${tasks.length > 0 ? "border-2 border-amber-200" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-earth-900">Dagens opgaver</h2>
          <Link href="/drift" className="text-xs text-earth-400 hover:text-earth-600 transition-colors">
            Se alt →
          </Link>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <Link key={i} href="/drift"
                className="flex items-center gap-3 bg-amber-50 rounded-xl p-3 hover:bg-amber-100 transition-colors">
                <span className="text-lg flex-shrink-0">{task.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-earth-900">{task.label}</p>
                  <p className="text-xs text-earth-500 mt-0.5">{task.sub}</p>
                </div>
                {task.urgent && (
                  <span className="text-[10px] font-semibold bg-red-100 text-red-600 rounded-full px-2 py-0.5 flex-shrink-0">
                    Nu
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-grass-50 rounded-xl px-4 py-3">
            <span className="text-base">✓</span>
            <p className="text-sm text-grass-700 font-medium">Alt ser godt ud i dag</p>
          </div>
        )}
      </div>

      {/* ── Vejrudsigt ── */}
      {forecast.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-earth-800 mb-3">Vejrudsigt</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {forecast.map((day) => {
              const d = new Date(day.date);
              const dayName = d.toLocaleDateString("da-DK", { weekday: "short" });
              return (
                <div key={day.date}
                  className="flex-shrink-0 flex flex-col items-center gap-1 bg-earth-50 rounded-xl p-2.5 min-w-[58px]">
                  <p className="text-xs text-earth-500 capitalize">{dayName}</p>
                  <p className="text-xl">{weatherIcon(day.weather_code)}</p>
                  <p className="text-xs font-semibold text-earth-800">{Math.round(day.temp_max)}°</p>
                  <p className="text-[10px] text-sky-500">{day.precipitation} mm</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Seneste aktivitet ── */}
      {topActivities.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-earth-800 mb-1">Seneste aktivitet</h3>
          <div>
            {topActivities.map((act) => (
              <Link key={act.id} href={act.href}
                className="flex items-center gap-3 py-2.5 border-b border-earth-50 last:border-0 hover:bg-earth-50 -mx-4 px-4 transition-colors">
                <span className="text-lg flex-shrink-0">{act.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-earth-800 truncate">
                    {act.label}
                    <span className="font-normal text-earth-400"> — {act.sub}</span>
                  </p>
                  <p className="text-xs text-earth-400">{shortDate(act.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
