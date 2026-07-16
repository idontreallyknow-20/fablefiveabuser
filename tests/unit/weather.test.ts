import { describe, expect, it } from "vitest";
import { weatherCodeInfo } from "@/lib/weather/codes";
import { getDayPhase, SKY_PALETTES } from "@/lib/weather/phase";

describe("weatherCodeInfo", () => {
  it("maps WMO codes to scene kinds", () => {
    expect(weatherCodeInfo(0).kind).toBe("clear");
    expect(weatherCodeInfo(63).kind).toBe("rain");
    expect(weatherCodeInfo(73).kind).toBe("snow");
    expect(weatherCodeInfo(45).kind).toBe("fog");
    expect(weatherCodeInfo(95).kind).toBe("storm");
    expect(weatherCodeInfo(95).isStorm).toBe(true);
  });

  it("falls back safely for unknown codes", () => {
    const info = weatherCodeInfo(1234);
    expect(info.kind).toBe("clouds");
    expect(info.isStorm).toBe(false);
  });
});

describe("getDayPhase (Richmond Hill)", () => {
  const LAT = 43.8828;
  const LON = -79.4403;

  it("returns night at 2am and midday around solar noon in July", () => {
    expect(getDayPhase(new Date("2026-07-16T02:00:00-04:00"), LAT, LON)).toBe("night");
    expect(getDayPhase(new Date("2026-07-16T13:00:00-04:00"), LAT, LON)).toBe("midday");
  });

  it("returns a dawn-side phase before a July sunrise", () => {
    const phase = getDayPhase(new Date("2026-07-16T05:15:00-04:00"), LAT, LON);
    expect(["predawn", "sunrise", "night"]).toContain(phase);
  });

  it("has a palette for every phase", () => {
    for (const p of Object.values(SKY_PALETTES)) {
      expect(p.bg0).toMatch(/^#/);
      expect(p.accent).toMatch(/^#/);
    }
  });
});
