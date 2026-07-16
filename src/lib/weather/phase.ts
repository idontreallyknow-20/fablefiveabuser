import * as SunCalc from "suncalc";
import type { DayPhase } from "@/lib/themes/registry";

/** Day phase from real astronomical times at the given location. */
export function getDayPhase(date: Date, lat: number, lon: number): DayPhase {
  const t = SunCalc.getTimes(date, lat, lon);
  const ms = date.getTime();

  const at = (d: Date | null | undefined) =>
    d && !Number.isNaN(d.getTime()) ? d.getTime() : null;

  const dawn = at(t.dawn);
  const sunrise = at(t.sunrise);
  const sunriseEnd = at(t.sunriseEnd);
  const goldenEnd = at(t.goldenHourEnd);
  const goldenStart = at(t.goldenHour);
  const sunsetStart = at(t.sunsetStart);
  const sunset = at(t.sunset);
  const dusk = at(t.dusk);
  const nauticalDawn = at(t.nauticalDawn);

  if (nauticalDawn && dawn && ms >= nauticalDawn && ms < dawn) return "predawn";
  if (dawn && sunriseEnd && ms >= dawn && ms < sunriseEnd) return "sunrise";
  if (sunriseEnd && goldenEnd && ms >= sunriseEnd && ms < goldenEnd) return "morning";
  if (goldenEnd && goldenStart && ms >= goldenEnd && ms < goldenStart) return "midday";
  if (goldenStart && sunsetStart && ms >= goldenStart && ms < sunsetStart) return "golden";
  if (sunsetStart && dusk && ms >= sunsetStart && ms < dusk) return "sunset";
  if (dusk && ms >= dusk && ms < dusk + 40 * 60 * 1000) return "blue-hour";
  if (sunrise && ms < sunrise) return "night";
  return "night";
}

export function getMoonIllumination(date: Date): number {
  return SunCalc.getMoonIllumination(date).fraction;
}

export function getSunTimes(date: Date, lat: number, lon: number) {
  const t = SunCalc.getTimes(date, lat, lon);
  return { sunrise: t.sunrise, sunset: t.sunset };
}

/** Living Sky palette per phase; applied as --sky-* variables. */
export const SKY_PALETTES: Record<
  DayPhase,
  { bg0: string; bg1: string; bg2: string; bg3: string; accent: string }
> = {
  predawn: { bg0: "#0a0c18", bg1: "#0e1120", bg2: "#131729", bg3: "#191e33", accent: "#a68bb8" },
  sunrise: { bg0: "#14101c", bg1: "#1a1524", bg2: "#231b2c", bg3: "#2c2233", accent: "#d99a6b" },
  morning: { bg0: "#0e1420", bg1: "#131a29", bg2: "#192134", bg3: "#20293f", accent: "#8fb0cf" },
  midday: { bg0: "#101724", bg1: "#161e2e", bg2: "#1c263a", bg3: "#232e46", accent: "#9ec0d9" },
  golden: { bg0: "#161118", bg1: "#1d1620", bg2: "#251c28", bg3: "#2e2330", accent: "#d9a05b" },
  sunset: { bg0: "#130f1a", bg1: "#191323", bg2: "#20192d", bg3: "#281f37", accent: "#cf7b5a" },
  "blue-hour": { bg0: "#0b0f22", bg1: "#0f142c", bg2: "#141a38", bg3: "#1a2145", accent: "#8f9fd9" },
  night: { bg0: "#0c1018", bg1: "#101520", bg2: "#151b28", bg3: "#1b2231", accent: "#c99a6b" },
};
