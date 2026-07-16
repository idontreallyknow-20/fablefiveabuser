// Open-Meteo WMO weather code mapping.
// https://open-meteo.com/en/docs (no API key required; free for non-commercial use)

import type { WeatherGate } from "@/lib/themes/registry";

export interface WeatherCodeInfo {
  label: string;
  kind: WeatherGate;
  isStorm: boolean;
}

const CODES: Record<number, WeatherCodeInfo> = {
  0: { label: "Clear sky", kind: "clear", isStorm: false },
  1: { label: "Mostly clear", kind: "clear", isStorm: false },
  2: { label: "Partly cloudy", kind: "clouds", isStorm: false },
  3: { label: "Overcast", kind: "clouds", isStorm: false },
  45: { label: "Fog", kind: "fog", isStorm: false },
  48: { label: "Icy fog", kind: "fog", isStorm: false },
  51: { label: "Light drizzle", kind: "drizzle", isStorm: false },
  53: { label: "Drizzle", kind: "drizzle", isStorm: false },
  55: { label: "Heavy drizzle", kind: "drizzle", isStorm: false },
  56: { label: "Freezing drizzle", kind: "drizzle", isStorm: false },
  57: { label: "Freezing drizzle", kind: "drizzle", isStorm: false },
  61: { label: "Light rain", kind: "rain", isStorm: false },
  63: { label: "Rain", kind: "rain", isStorm: false },
  65: { label: "Heavy rain", kind: "rain", isStorm: false },
  66: { label: "Freezing rain", kind: "rain", isStorm: false },
  67: { label: "Freezing rain", kind: "rain", isStorm: false },
  71: { label: "Light snow", kind: "snow", isStorm: false },
  73: { label: "Snow", kind: "snow", isStorm: false },
  75: { label: "Heavy snow", kind: "snow", isStorm: false },
  77: { label: "Snow grains", kind: "snow", isStorm: false },
  80: { label: "Light showers", kind: "rain", isStorm: false },
  81: { label: "Showers", kind: "rain", isStorm: false },
  82: { label: "Heavy showers", kind: "rain", isStorm: true },
  85: { label: "Snow showers", kind: "snow", isStorm: false },
  86: { label: "Heavy snow showers", kind: "snow", isStorm: false },
  95: { label: "Thunderstorm", kind: "storm", isStorm: true },
  96: { label: "Thunderstorm with hail", kind: "storm", isStorm: true },
  99: { label: "Thunderstorm with hail", kind: "storm", isStorm: true },
};

export function weatherCodeInfo(code: number): WeatherCodeInfo {
  return CODES[code] ?? { label: "Unknown", kind: "clouds", isStorm: false };
}
