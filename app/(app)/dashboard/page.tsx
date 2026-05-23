import { createClient } from "@/lib/supabase/server";
import { getWeather, weatherIcon } from "@/lib/weather";
import { daysSince, getGrazingRecommendation } from "@/lib/utils";
import Link from "next/link";
import EventIcon from "@/components/ui/EventIcon";
import { RefreshCw, CheckCircle, Worm } from "lucide-react";

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
          <h2 className="font-semibold text-earth-50 text-lg mb-2">Velkommen til Tend</h2>
          <p className="text-earth-300 text-sm mb-4">Start med at oprette din gård</p>
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
    { data: soilObsData },
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
    supabase
      .from("soil_observations")
      .select("field_id, observed_at, organic_matter_pct, earthworm_count, field:fields(name, area_ha)")
      .eq("farm_id", farm.id)
      .order("observed_at", { ascending: true }),
  ]);

  // ── Dagens opgaver ──
  const animalCountByFlock = (flockAnimals ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.flock_id) acc[a.flock_id] = (acc[a.flock_id] ?? 0) + 1;
    return acc;
  }, {});

  type Task = { label: string; sub: string; urgent: boolean };
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
        label: `Flyt ${flock.name}`,
        sub: `${daysGrazing} dage på "${section.name}"`,
        urgent: true,
      });
    }
  }

  // ── Kombineret aktivitetsfeed ──
  type Activity = { id: string; date: string; type: string; label: string; sub: string; href: string };
  const activities: Activity[] = [];

  for (const ev of animalEvents ?? []) {
    const animal = ev.animal as unknown as { ear_tag: string; name: string | null } | null;
    activities.push({
      id: `ae-${ev.id}`,
      date: ev.event_date,
      type: ev.event_type,
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
      type: "move",
      label: "Flytning",
      sub: `${flock?.name ?? "Flok"} → ${section?.name ?? "Sektion"}`,
      href: "/rotation",
    });
  }

  // Aktive grazings som aktiviteter (indsat i sektion)
  for (const record of activeGrazing ?? []) {
    const flock = record.flock as unknown as { id: string; name: string } | null;
    const section = record.section as unknown as { id: string; name: string; area_ha: number } | null;
    if (!flock || !section) continue;
    activities.push({
      id: `gr-start-${record.id}`,
      date: record.start_date,
      type: "move",
      label: "Indsat i sektion",
      sub: `${flock.name} → ${section.name}`,
      href: "/rotation",
    });
  }

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const topActivities = activities.slice(0, 6);

  // ── Jordsundhed tracker ──
  type SoilObsRow = {
    field_id: string;
    observed_at: string;
    organic_matter_pct: number | null;
    earthworm_count: number | null;
    field: { name: string; area_ha: number } | null;
  };

  const byField = ((soilObsData ?? []) as unknown as SoilObsRow[]).reduce<Record<string, SoilObsRow[]>>((acc, obs) => {
    acc[obs.field_id] = [...(acc[obs.field_id] ?? []), obs];
    return acc;
  }, {});

  let totalCO2 = 0;
  let co2Fields = 0;
  const latestOmValues: number[] = [];
  const latestWormCounts: number[] = [];

  for (const obs of Object.values(byField)) {
    const withOm = obs.filter(o => o.organic_matter_pct != null);
    if (withOm.length >= 2) {
      const earliest = withOm[0];
      const latest = withOm[withOm.length - 1];
      const area = (latest.field as { name: string; area_ha: number } | null)?.area_ha ?? 0;
      const diff = (latest.organic_matter_pct ?? 0) - (earliest.organic_matter_pct ?? 0);
      if (diff > 0) {
        totalCO2 += diff * area * 11;
        co2Fields++;
      }
    }
    const latestWithOm = obs.filter(o => o.organic_matter_pct != null).slice(-1)[0];
    if (latestWithOm?.organic_matter_pct != null) latestOmValues.push(latestWithOm.organic_matter_pct);
    const latestWithWorms = obs.filter(o => o.earthworm_count != null).slice(-1)[0];
    if (latestWithWorms?.earthworm_count != null) latestWormCounts.push(latestWithWorms.earthworm_count);
  }

  const avgOm = latestOmValues.length > 0
    ? latestOmValues.reduce((s, v) => s + v, 0) / latestOmValues.length
    : null;
  const avgWorms = latestWormCounts.length > 0
    ? Math.round(latestWormCounts.reduce((s, v) => s + v, 0) / latestWormCounts.length)
    : null;
  const hasSoilData = Object.keys(byField).length > 0;

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
      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-earth-300 text-xs font-medium uppercase tracking-wide">
              {todayLabel()}
            </p>
            <h1 className="text-2xl font-bold text-earth-50 mt-0.5">{farm.name}</h1>
            {farm.location && (
              <p className="text-earth-300 text-sm mt-0.5">{farm.location}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl">{weather ? weatherIcon(weather.weather_code) : "🌤️"}</p>
            {weather && (
              <>
                <p className="text-earth-50 font-bold text-lg leading-none mt-1">
                  {Math.round(weather.temp_mean)}°C
                </p>
                <p className="text-earth-300 text-xs mt-0.5">
                  {Math.round(weather.temp_min)}° / {Math.round(weather.temp_max)}°
                </p>
              </>
            )}
          </div>
        </div>
        {weather && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-earth-200">🌧️ {weather.precipitation} mm</span>
            <span className="text-earth-200">💨 {Math.round(weather.wind_speed)} km/t</span>
            {weather.humidity != null && (
              <span className="text-earth-200">💧 {Math.round(weather.humidity)}%</span>
            )}
            {weather.uv_index != null && (
              <span className="text-earth-200">☀️ UV {Math.round(weather.uv_index)}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Dagens opgaver ── */}
      <div className={`card space-y-2 ${tasks.length > 0 ? "border-2 border-amber-200" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-earth-50">Dagens opgaver</h2>
          <Link href="/drift" className="text-xs text-earth-200 hover:text-earth-400 transition-colors">
            Se alt →
          </Link>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <Link key={i} href="/drift"
                className="flex items-center gap-3 rounded-xl p-3 transition-colors"
                style={{ background: "rgba(196,98,42,0.12)" }}>
                <RefreshCw size={18} className="flex-shrink-0 text-clay-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-earth-50">{task.label}</p>
                  <p className="text-xs text-earth-200 mt-0.5">{task.sub}</p>
                </div>
                {task.urgent && (
                  <span className="text-[10px] font-semibold bg-clay-500 text-white rounded-full px-2 py-0.5 flex-shrink-0">
                    Nu
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-white/5">
            <CheckCircle size={16} className="text-earth-300 flex-shrink-0" />
            <p className="text-sm text-earth-300">Ingen gøremål planlagt</p>
          </div>
        )}
      </div>

      {/* ── Vejrudsigt ── */}
      {forecast.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-earth-100 mb-3">Vejrudsigt</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {forecast.map((day) => {
              const d = new Date(day.date);
              const dayName = d.toLocaleDateString("da-DK", { weekday: "short" });
              return (
                <div key={day.date}
                  className="flex-shrink-0 flex flex-col items-center gap-1 bg-white/5 rounded-xl p-2.5 min-w-[64px]">
                  <p className="text-xs text-earth-300 capitalize">{dayName}</p>
                  <p className="text-xl">{weatherIcon(day.weather_code)}</p>
                  <p className="text-xs font-semibold text-earth-100">{Math.round(day.temp_max)}° / {Math.round(day.temp_min)}°</p>
                  <p className="text-[10px] text-earth-300">🌧️ {day.precipitation} mm</p>
                  {day.uv_index != null && (
                    <p className="text-[10px] text-earth-300">UV {Math.round(day.uv_index)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Jordsundhed tracker ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-earth-100 flex items-center gap-2">
            <Worm size={16} className="text-earth-300" />
            Jordsundhed
          </h3>
          <Link href="/pastures" className="text-xs text-earth-200 hover:text-earth-400 transition-colors">
            Se marker →
          </Link>
        </div>

        {hasSoilData ? (
          <div className="space-y-3">
            {totalCO2 > 0 && (
              <div className="rounded-xl p-3 border border-white/10">
                <p className="text-xs text-earth-400">Estimeret CO₂ bundet i jord</p>
                <p className="text-2xl font-bold text-earth-50 mt-0.5">{totalCO2.toFixed(1)} t</p>
                <p className="text-xs text-earth-400 mt-0.5">
                  baseret på OM%-stigning på {co2Fields} mark{co2Fields !== 1 ? "er" : ""} · 1% stigning ≈ 11 t/ha
                </p>
              </div>
            )}
            {(avgOm != null || avgWorms != null) && (
              <div className="grid grid-cols-2 gap-3">
                {avgOm != null && (
                  <div className="rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-earth-400">Gns. organisk stof</p>
                    <p className="text-xl font-bold text-earth-50 mt-0.5">{avgOm.toFixed(1)}%</p>
                    <p className="text-xs text-earth-400 mt-0.5">
                      {avgOm < 2 ? "Lav" : avgOm < 4 ? "Middel" : "God"}
                    </p>
                  </div>
                )}
                {avgWorms != null && (
                  <div className="rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-earth-400">Gns. orme/m²</p>
                    <p className="text-xl font-bold text-earth-50 mt-0.5">{avgWorms}</p>
                    <p className="text-xs text-earth-400 mt-0.5">
                      {avgWorms < 10 ? "Lav aktivitet" : avgWorms < 25 ? "God" : "Fremragende"}
                    </p>
                  </div>
                )}
              </div>
            )}
            {totalCO2 === 0 && (
              <p className="text-xs text-earth-400 text-center py-1">
                Tilføj mindst to jordobservationer pr. mark for at se CO₂-estimater
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-earth-300">Ingen jordobservationer endnu</p>
            <Link href="/pastures" className="text-xs text-earth-400 mt-1 block hover:text-earth-200 transition-colors">
              Gå til en mark og tilføj pH, OM% og ormetal →
            </Link>
          </div>
        )}
      </div>

      {/* ── Seneste aktivitet ── */}
      {topActivities.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-earth-100 mb-1">Seneste aktivitet</h3>
          <div>
            {topActivities.map((act) => (
              <Link key={act.id} href={act.href}
                className="flex items-center gap-3 py-2.5 border-b last:border-0 -mx-4 px-4 transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <EventIcon type={act.type} size={18} className="flex-shrink-0 text-earth-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-earth-100 truncate">
                    {act.label}
                    <span className="font-normal text-earth-200"> — {act.sub}</span>
                  </p>
                  <p className="text-xs text-earth-200">{shortDate(act.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
