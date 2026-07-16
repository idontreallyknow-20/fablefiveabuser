"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings/store";
import { getSunTimes } from "@/lib/weather/phase";

/**
 * Automatic theme schedule. Applies the day/night theme only when the
 * boundary is crossed, so a manual theme choice sticks until the next
 * sunrise/sunset (or fixed hour) transition.
 */
export function AutoTheme() {
  const { settings, set } = useSettings();
  const lastDesired = useRef<string | null>(null);

  useEffect(() => {
    if (!settings.autoSchedule.enabled) {
      lastDesired.current = null;
      return;
    }
    const tick = () => {
      const now = new Date();
      let isDay: boolean;
      if (settings.autoSchedule.followSun) {
        const { sunrise, sunset } = getSunTimes(now, settings.location.lat, settings.location.lon);
        isDay =
          sunrise instanceof Date && sunset instanceof Date
            ? now >= sunrise && now < sunset
            : now.getHours() >= 7 && now.getHours() < 20;
      } else {
        const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const { dayStart, nightStart } = settings.autoSchedule;
        isDay = dayStart <= nightStart ? hhmm >= dayStart && hhmm < nightStart : hhmm >= dayStart || hhmm < nightStart;
      }
      const desired = isDay ? settings.autoSchedule.dayTheme : settings.autoSchedule.nightTheme;
      if (lastDesired.current !== desired) {
        lastDesired.current = desired;
        if (settings.theme !== desired) set({ theme: desired });
      }
    };
    tick();
    const iv = setInterval(tick, 60_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoSchedule, settings.location.lat, settings.location.lon]);

  return null;
}
