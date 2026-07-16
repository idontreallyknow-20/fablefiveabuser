"use client";

import Link from "next/link";
import { Clock } from "@/components/today/Clock";
import { WeatherChip } from "@/components/today/WeatherChip";
import { Priorities } from "@/components/today/Priorities";
import { PlayerCard } from "@/components/spotify/PlayerCard";
import { TodayEvents, nextEventOf, useCalendarStatus, useTodayEvents } from "@/components/calendar/TodayEvents";
import { RoutinesDue } from "@/components/routines/RoutinesDue";
import { IconAmbient, IconFocus } from "@/components/ui/Icons";
import { useSettings } from "@/lib/settings/store";

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

      <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:gap-12">
        <div>
          <Priorities />
        </div>
        <div className="flex flex-col gap-3">
          <div className="rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
            <PlayerCard />
          </div>
          <div className="rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
            <TodayEvents />
          </div>
          <div className="rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
            <RoutinesDue />
          </div>
        </div>
      </div>
    </div>
  );
}
