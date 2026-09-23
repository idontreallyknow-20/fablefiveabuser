"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  useDisplay,
  useDisplayHeartbeat,
  useDisplaysRealtime,
} from "@/lib/displays/useDisplays";
import { isThemeId } from "@/lib/themes/registry";
import { AtmosphereCanvas } from "@/components/atmosphere/AtmosphereCanvas";
import { Clock } from "@/components/today/Clock";
import { WeatherChip } from "@/components/today/WeatherChip";
import { Priorities } from "@/components/today/Priorities";
import { LofiControl } from "@/components/soundboard/LofiControl";
import { TodayEvents } from "@/components/calendar/TodayEvents";
import { DisplayNerf, DisplayFitness } from "@/components/displays/RoleWidgets";

export default function DisplayView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useDisplaysRealtime();
  useDisplayHeartbeat(id);
  const { data: display } = useDisplay(id);
  const [controlsVisible, setControlsVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const poke = () => {
      setControlsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControlsVisible(false), 3000);
    };
    window.addEventListener("pointermove", poke, { passive: true });
    return () => {
      window.removeEventListener("pointermove", poke);
      clearTimeout(timer);
    };
  }, []);

  if (!display) {
    return (
      <main className="relative z-10 flex min-h-dvh items-center justify-center">
        <p className="text-sm text-ink-faint">Loading display</p>
      </main>
    );
  }

  const themeOverride = isThemeId(display.theme) ? display.theme : undefined;

  return (
    <div
      data-theme={themeOverride}
      className="relative min-h-dvh"
      style={{ filter: `brightness(${display.brightness})` }}
    >
      {themeOverride && (
        <AtmosphereCanvas key={themeOverride} themeOverride={themeOverride} />
      )}
      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-10 px-8 py-12">
        <h1 className="sr-only">{display.name}</h1>
        {display.role === "command" && (
          <>
            <Clock size="hero" meta={<><span aria-hidden className="text-ink-faint">·</span><WeatherChip /></>} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <Priorities />
              <div className="flex flex-col gap-3">
                <div className="surface p-5">
                  <LofiControl />
                </div>
                <TodayEvents />
              </div>
            </div>
          </>
        )}

        {display.role === "calendar" && (
          <>
            <Clock size="compact" meta={<><span aria-hidden className="text-ink-faint">·</span><WeatherChip /></>} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <TodayEvents />
              <Priorities />
            </div>
          </>
        )}

        {display.role === "music" && (
          <div className="mx-auto w-full max-w-xl space-y-6">
            <Clock size="compact" />
            <div className="surface p-5">
              <LofiControl />
            </div>
          </div>
        )}

        {display.role === "priorities" && (
          <div className="mx-auto w-full max-w-2xl space-y-8">
            <Clock size="compact" meta={<><span aria-hidden className="text-ink-faint">·</span><WeatherChip /></>} />
            <Priorities />
          </div>
        )}

        {display.role === "nerfchess" && <DisplayNerf />}
        {display.role === "fitness" && <DisplayFitness />}

        {display.role === "ambient" && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <Clock size="ambient" meta={<><span aria-hidden className="text-ink-faint">·</span><WeatherChip /></>} />
          </div>
        )}

        {display.role === "focus" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <Clock size="ambient" />
            <Link href="/focus" className="text-sm text-accent hover:underline">
              Start a focus session
            </Link>
          </div>
        )}

        {display.role === "custom" && (
          <>
            <Clock size="hero" meta={<><span aria-hidden className="text-ink-faint">·</span><WeatherChip /></>} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <Priorities />
              <div className="flex flex-col gap-3">
                <div className="surface p-5">
                  <LofiControl />
                </div>
                <TodayEvents />
              </div>
            </div>
          </>
        )}
      </main>

      <div
        className={`fixed inset-x-0 bottom-6 z-20 flex justify-center transition-opacity duration-[var(--dur-slow)] ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Link
          href="/today"
          className="floating rounded-full px-5 py-2.5 text-sm text-ink-dim transition-colors hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
