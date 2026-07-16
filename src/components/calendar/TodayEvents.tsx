"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { IconCalendar } from "@/components/ui/Icons";
import { useSettings } from "@/lib/settings/store";

interface CalendarStatus {
  configured: boolean;
  connected: boolean;
}

export function useCalendarStatus() {
  return useQuery<CalendarStatus>({
    queryKey: ["google", "status"],
    queryFn: async () => {
      const res = await fetch("/api/google/status");
      if (!res.ok) throw new Error("status failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export interface OrbitEvent {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  color: string | null;
  calendarId: string;
}

export function useTodayEvents(enabled: boolean) {
  return useQuery<{ events: OrbitEvent[] }>({
    queryKey: ["google", "events", "today"],
    queryFn: async () => {
      const res = await fetch("/api/google/events?range=today");
      if (!res.ok) throw new Error("events failed");
      return res.json();
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function nextEventOf(events: OrbitEvent[]): OrbitEvent | null {
  const now = Date.now();
  const upcoming = events
    .filter((e) => e.startsAt && new Date(e.startsAt).getTime() > now && !e.allDay)
    .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime());
  return upcoming[0] ?? null;
}

export function TodayEvents() {
  const { data: status } = useCalendarStatus();
  const { data } = useTodayEvents(Boolean(status?.connected));
  const timezone = useSettings((s) => s.settings.location.timezone);

  if (!status) return <div className="surface h-24 animate-pulse" aria-hidden />;

  if (!status.configured || !status.connected) {
    return (
      <div className="surface flex items-center gap-3.5 p-4">
        <IconCalendar size={18} className="shrink-0 text-ink-faint" />
        <div>
          <p className="text-sm text-ink-dim">
            {status.configured ? "Google Calendar is not connected" : "Calendar sync is not set up yet"}
          </p>
          <p className="text-[12.5px] text-ink-faint">
            {status.configured ? (
              <a href="/api/google/auth" className="text-accent hover:underline">
                Connect Google Calendar
              </a>
            ) : (
              <>
                Add the API keys, then connect in{" "}
                <Link href="/space/connections" className="text-accent hover:underline">
                  Space
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  const events = data?.events ?? [];
  const fmt = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });

  // eslint-disable-next-line react-hooks/purity -- a coarse "now" for dimming past events; refreshed by the 5-minute refetch
  const now = Date.now();

  return (
    <div className="surface p-4">
      <p className="eyebrow mb-2.5">Today&apos;s calendar</p>
      {events.length === 0 ? (
        <p className="text-sm text-ink-faint">Nothing scheduled. The day is yours.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {events.slice(0, 6).map((e) => {
            const past = e.endsAt && new Date(e.endsAt).getTime() < now;
            return (
              <li key={e.id} className={`flex items-baseline gap-3 ${past ? "opacity-45" : ""}`}>
                <span className="tnum w-11 shrink-0 font-mono text-[12px] text-ink-faint">
                  {e.allDay ? "All day" : e.startsAt ? fmt.format(new Date(e.startsAt)) : ""}
                </span>
                <span
                  className="mt-1 h-2 w-0.5 shrink-0 self-stretch rounded-full"
                  style={{ background: e.color ?? "var(--accent)" }}
                  aria-hidden
                />
                <span className="truncate text-sm text-ink-dim">{e.title}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
