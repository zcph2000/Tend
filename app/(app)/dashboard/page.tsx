import { createClient } from "@/lib/supabase/server";
import { getWeather, weatherIcon, weatherDescription } from "@/lib/weather";
import { formatDate, daysSince } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch farm data
  const { data: farm } = await supabase
    .from("farms")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  // Fetch animal counts
  const { count: totalAnimals } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("farm_id", farm?.id)
    .eq("status", "active");

  // Fetch active grazing record
  const { data: activeGrazing } = await supabase
    .from("grazing_records")
    .select("*, section:sections(name, area_ha, field:fields(name))")
    .eq("farm_id", farm?.id)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  // Fetch recent events
  const { data: recentEvents } = await supabase
    .from("animal_events")
    .select("*, animal:animals(ear_tag, name)")
    .eq("farm_id", farm?.id)
    .order("event_date", { ascending: false })
    .limit(5);

  // Get weather
  let weather = null;
  try {
    const weatherData = await getWeather(farm?.lat ?? 55.75, farm?.lng ?? 11.0);
    weather = weatherData[0];
  } catch {
    // silent
  }

  if (!farm) {
    return (
      <div className="space-y-4">
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">🌱</div>
          <h2 className="font-semibold text-earth-900 text-lg mb-2">
            Velkommen til Tend
          </h2>
          <p className="text-earth-500 text-sm mb-4">
            Start med at oprette din gård
          </p>
          <Link href="/settings" className="btn-primary inline-block">
            Opret gård
          </Link>
        </div>
      </div>
    );
  }

  const daysGrazing = activeGrazing
    ? daysSince(activeGrazing.start_date)
    : null;

  return (
    <div className="space-y-4">
      {/* Farm header */}
      <div className="card bg-gradient-to-br from-grass-600 to-grass-800 text-white border-0">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-grass-200 text-xs font-medium uppercase tracking-wide">
              Din gård
            </p>
            <h1 className="text-2xl font-bold mt-0.5">{farm.name}</h1>
            {farm.location && (
              <p className="text-grass-300 text-sm mt-0.5">{farm.location}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl">{weather ? weatherIcon(weather.weather_code) : "🌤️"}</p>
            {weather && (
              <p className="text-grass-200 text-sm mt-0.5">
                {Math.round(weather.temp_mean)}°C
              </p>
            )}
          </div>
        </div>
        {weather && (
          <div className="mt-3 pt-3 border-t border-grass-500 flex gap-4 text-sm">
            <span className="text-grass-200">
              🌧️ {weather.precipitation} mm
            </span>
            <span className="text-grass-200">
              💨 {Math.round(weather.wind_speed)} km/t
            </span>
            <span className="text-grass-200">
              {weatherDescription(weather.weather_code)}
            </span>
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/animals" className="card hover:shadow-md transition-shadow">
          <p className="text-earth-500 text-xs font-medium uppercase tracking-wide">
            Aktive dyr
          </p>
          <p className="text-3xl font-bold text-earth-900 mt-1">
            {totalAnimals ?? 0}
          </p>
          <p className="text-earth-400 text-xs mt-1">Se alle →</p>
        </Link>

        <Link href="/rotation" className="card hover:shadow-md transition-shadow">
          <p className="text-earth-500 text-xs font-medium uppercase tracking-wide">
            Nuværende sektion
          </p>
          {activeGrazing ? (
            <>
              <p className="text-lg font-bold text-earth-900 mt-1 leading-tight">
                {(activeGrazing.section as { name: string } | null)?.name ?? "—"}
              </p>
              <p className="text-earth-400 text-xs mt-1">
                Dag {daysGrazing} af rotationen
              </p>
            </>
          ) : (
            <p className="text-earth-400 text-sm mt-2">Ingen aktiv rotation</p>
          )}
        </Link>
      </div>

      {/* Rotation alert */}
      {activeGrazing && daysGrazing !== null && daysGrazing >= 3 && (
        <div className="card border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800">Tid til at flytte flokken?</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Dyrene har været i{" "}
                <strong>{(activeGrazing.section as { name: string } | null)?.name}</strong> i{" "}
                {daysGrazing} dage. Vurder græshøjden og flyt hvis nødvendigt.
              </p>
              <Link
                href="/rotation"
                className="inline-block mt-2 text-sm font-medium text-amber-800 underline"
              >
                Gå til rotation →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent events */}
      {recentEvents && recentEvents.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-earth-800 mb-3">Seneste hændelser</h3>
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 py-2 border-b border-earth-50 last:border-0"
              >
                <span className="text-lg">{eventIcon(event.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-earth-800 truncate">
                    {eventLabel(event.event_type)} —{" "}
                    {(event.animal as { ear_tag: string; name: string | null } | null)?.name ??
                      (event.animal as { ear_tag: string } | null)?.ear_tag}
                  </p>
                  <p className="text-xs text-earth-400">
                    {formatDate(event.event_date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/animals"
            className="block text-center text-sm text-grass-600 font-medium mt-3"
          >
            Se alle dyr →
          </Link>
        </div>
      )}

      {/* Weather forecast */}
      <WeatherForecastCard lat={farm.lat} lng={farm.lng} />
    </div>
  );
}

async function WeatherForecastCard({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  let forecast = null;
  try {
    forecast = await getWeather(lat ?? 55.75, lng ?? 11.0);
  } catch {
    return null;
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-earth-800 mb-3">7-dages vejrudsigt</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {forecast.slice(0, 7).map((day) => {
          const date = new Date(day.date);
          const dayName = date.toLocaleDateString("da-DK", { weekday: "short" });
          return (
            <div
              key={day.date}
              className="flex-shrink-0 flex flex-col items-center gap-1 bg-earth-50 rounded-xl p-2 min-w-[52px]"
            >
              <p className="text-xs text-earth-500 capitalize">{dayName}</p>
              <p className="text-xl">{weatherIcon(day.weather_code)}</p>
              <p className="text-xs font-semibold text-earth-800">
                {Math.round(day.temp_max)}°
              </p>
              <p className="text-xs text-sky-500">{day.precipitation}mm</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    vaccination: "💉",
    worming: "💊",
    tupping: "🐏",
    lambing: "🐑",
    weighing: "⚖️",
    treatment: "🏥",
    observation: "👁️",
    note: "📝",
  };
  return icons[type] ?? "📋";
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    vaccination: "Vaccination",
    worming: "Ormekur",
    tupping: "Sat til vædder",
    lambing: "Lammede",
    weighing: "Vejet",
    treatment: "Behandling",
    observation: "Observation",
    note: "Note",
  };
  return labels[type] ?? type;
}
