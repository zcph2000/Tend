import { WeatherData } from "@/types";

// Røsnæs peninsula coordinates as default — updated per farm
const DEFAULT_LAT = 55.75;
const DEFAULT_LNG = 11.0;

export async function getWeather(
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG
): Promise<WeatherData[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code,relative_humidity_2m_mean,uv_index_max"
  );
  url.searchParams.set("timezone", "Europe/Copenhagen");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Vejrdata kunne ikke hentes");

  const json = await res.json();
  const d = json.daily;

  return d.time.map((date: string, i: number) => ({
    date,
    temp_max: d.temperature_2m_max[i],
    temp_min: d.temperature_2m_min[i],
    temp_mean: d.temperature_2m_mean[i],
    precipitation: d.precipitation_sum[i],
    wind_speed: d.wind_speed_10m_max[i],
    weather_code: d.weather_code[i],
    humidity: d.relative_humidity_2m_mean?.[i],
    uv_index: d.uv_index_max?.[i],
  }));
}

export function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌤️";
}

export function weatherDescription(code: number): string {
  if (code === 0) return "Klar himmel";
  if (code <= 3) return "Delvis skyet";
  if (code <= 48) return "Tåge";
  if (code <= 55) return "Let dryp";
  if (code <= 67) return "Regn";
  if (code <= 77) return "Sne";
  if (code <= 82) return "Regnbyger";
  if (code <= 99) return "Tordenvejr";
  return "Skyet";
}
