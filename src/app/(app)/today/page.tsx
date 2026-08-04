"use client";

import Link from "next/link";
import { Clock } from "@/components/today/Clock";
import { WeatherChip } from "@/components/today/WeatherChip";
import { Priorities } from "@/components/today/Priorities";
import { PlayerCard } from "@/components/spotify/PlayerCard";
import { TodayEvents, nextEventOf, useCalendarStatus, useTodayEvents } from "@/components/calendar/TodayEvents";
import { RoutinesDue } from "@/components/routines/RoutinesDue";
import { DueSoon } from "@/components/today/DueSoon";
import { IconAmbient, IconFocus } from "@/components/ui/Icons";
import { useSettings } from "@/lib/settings/store";
import { presetById, visibleWidgets } from "@/lib/settings/layout";

function NextEventMeta() {
  const { data: status } = useCalendarStatus();
  const { data } = useTodayEvents(Boolean(status?.connected));
  const timezone = useSettings((s) => s.settings.location.timezone);
  const next = data ? nextEventOf(data.events) : null;
  if (!next?.startsAt) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
  return (
    <span className="tnum inline-flex items-center gap-1.5">
      <span aria-hidden className="text-ink-faint">·</span>
      <span>
        {fmt.format(new Date(next.startsAt))} {next.title}
      </span>
    </span>
  );
}

export default function TodayPage() {
  const layoutPreset = useSettings((s) => s.settings.layoutPreset);
  const hiddenWidgets = useSettings((s) => s.settings.hiddenWidgets);
  const preset = presetById(layoutPreset);
  const widgets = visibleWidgets(layoutPreset, hiddenWidgets);
  const sideWidgets = ["player", "calendar", "routines"].filter((w) =>
    widgets.has(w as "player" | "calendar" | "routines"),
  );
  const showPriorities = widgets.has("priorities");

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <header className="rise mb-10 mt-[4vh] flex flex-wrap items-end justify-between gap-6 md:mt-[6vh]">
        <Clock
          size="hero"
          meta={
            <>
              <span aria-hidden className="text-ink-faint">·</span>
              <WeatherChip />
              <NextEventMeta />
            </>
          }
        />
        <div className="flex items-center gap-2 pb-2">
          <Link
            href="/focus"
            className="flex h-10 items-center gap-2 rounded-xl border border-line bg-bg1/70 px-4 text-sm font-medium text-ink-dim transition-colors duration-[var(--dur-base)] hover:border-line-strong hover:text-ink"
          >
            <IconFocus size={16} />
            Focus
          </Link>
          <Link
            href="/ambient"
            aria-label="Ambient mode"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg1/70 text-ink-dim transition-colors duration-[var(--dur-base)] hover:border-line-strong hover:text-ink"
          >
            <IconAmbient size={16} />
          </Link>
        </div>
      </header>

      <div
        className={`grid flex-1 grid-cols-1 gap-8 xl:gap-12 ${
          showPriorities && sideWidgets.length > 0
            ? preset.prioritiesFirst
              ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
              : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
            : "lg:max-w-2xl"
        }`}
      >
        {showPriorities && preset.prioritiesFirst && <Priorities />}
        {sideWidgets.length > 0 && (
          <div className="flex flex-col gap-3">
            {sideWidgets.includes("calendar") && !preset.prioritiesFirst && (
              <div className="rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
                <TodayEvents />
              </div>
            )}
            {sideWidgets.includes("player") && (
              <div className="rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
                <PlayerCard />
              </div>
            )}
            {sideWidgets.includes("calendar") && preset.prioritiesFirst && (
              <div className="rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
                <TodayEvents />
              </div>
            )}
            <div className="rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
              <DueSoon />
            </div>
            {sideWidgets.includes("routines") && (
              <div className="rise" style={{ "--stagger-i": 5 } as React.CSSProperties}>
                <RoutinesDue />
              </div>
            )}
          </div>
        )}
        {showPriorities && !preset.prioritiesFirst && <Priorities />}
      </div>
    </div>
  );
}
