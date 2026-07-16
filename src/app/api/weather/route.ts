import { NextRequest, NextResponse } from "next/server";
import { weatherCodeInfo } from "@/lib/weather/codes";

export const revalidate = 0;

// small in-memory cache; open-meteo asks clients to be reasonable
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat") ?? "43.8828");
  const lon = Number(req.nextUrl.searchParams.get("lon") ?? "-79.4403");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json(hit.data, {
      headers: { "cache-control": "public, max-age=300" },
    });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,precipitation,snowfall,cloud_cover,visibility,wind_speed_10m,is_day,relative_humidity_2m",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max",
  );
  url.searchParams.set("hourly", "temperature_2m,weather_code,precipitation_probability");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Weather service unavailable" }, { status: 502 });
    }
    const raw = (await res.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        weather_code: number;
        precipitation: number;
        snowfall: number;
        cloud_cover: number;
        visibility: number;
        wind_speed_10m: number;
        is_day: number;
        relative_humidity_2m: number;
      };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        sunrise: string[];
        sunset: string[];
        precipitation_probability_max: (number | null)[];
      };
      hourly: {
        time: string[];
        temperature_2m: number[];
        weather_code: number[];
        precipitation_probability: (number | null)[];
      };
      timezone: string;
    };

    const info = weatherCodeInfo(raw.current.weather_code);
    const data = {
      current: {
        temperature: raw.current.temperature_2m,
        feelsLike: raw.current.apparent_temperature,
        code: raw.current.weather_code,
        label: info.label,
        kind: info.kind,
        isStorm: info.isStorm,
        precipitation: raw.current.precipitation,
        snowfall: raw.current.snowfall,
        cloudCover: raw.current.cloud_cover / 100,
        visibility: Math.min(1, raw.current.visibility / 20000),
        windKph: raw.current.wind_speed_10m,
        humidity: raw.current.relative_humidity_2m,
        isDay: raw.current.is_day === 1,
      },
      daily: raw.daily.time.map((t, i) => ({
        date: t,
        code: raw.daily.weather_code[i],
        label: weatherCodeInfo(raw.daily.weather_code[i]).label,
        kind: weatherCodeInfo(raw.daily.weather_code[i]).kind,
        max: raw.daily.temperature_2m_max[i],
        min: raw.daily.temperature_2m_min[i],
        sunrise: raw.daily.sunrise[i],
        sunset: raw.daily.sunset[i],
        precipProbability: raw.daily.precipitation_probability_max[i] ?? null,
      })),
      hourly: raw.hourly.time.slice(0, 48).map((t, i) => ({
        time: t,
        temperature: raw.hourly.temperature_2m[i],
        code: raw.hourly.weather_code[i],
        precipProbability: raw.hourly.precipitation_probability[i] ?? null,
      })),
      timezone: raw.timezone,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(key, { at: Date.now(), data });
    return NextResponse.json(data, {
      headers: { "cache-control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Weather service unreachable" }, { status: 502 });
  }
}
