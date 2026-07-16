"use client";

import { useWeather } from "@/lib/weather/useWeather";
import {
  IconClearDay,
  IconClearNight,
  IconCloud,
  IconFog,
  IconRain,
  IconSnow,
  IconStorm,
} from "@/components/ui/Icons";
import type { WeatherGate } from "@/lib/themes/registry";

export function WeatherIcon({ kind, isDay, size = 16 }: { kind: WeatherGate; isDay: boolean; size?: number }) {
  switch (kind) {
    case "rain":
    case "drizzle":
      return <IconRain size={size} />;
    case "snow":
      return <IconSnow size={size} />;
    case "fog":
      return <IconFog size={size} />;
    case "storm":
      return <IconStorm size={size} />;
    case "clear":
      return isDay ? <IconClearDay size={size} /> : <IconClearNight size={size} />;
    default:
      return <IconCloud size={size} />;
  }
}

/** inline weather for the clock metadata line */
export function WeatherChip() {
  const { data, isError } = useWeather();
  if (isError) {
    return <span className="text-ink-faint">Weather unavailable</span>;
  }
  if (!data) {
    return <span className="text-ink-faint">…</span>;
  }
  const c = data.current;
  return (
    <span className="tnum inline-flex items-center gap-1.5">
      <WeatherIcon kind={c.kind} isDay={c.isDay} />
      <span>
        {Math.round(c.temperature)}° {c.label}
      </span>
    </span>
  );
}
