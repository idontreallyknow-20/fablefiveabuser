"use client";

import { useMemo } from "react";
import Link from "next/link";
import { todayISO, useTasks } from "@/lib/data/tasks";
import { useRoutines } from "@/lib/data/routines";
import { mergeCalendar, type CalendarItem } from "@/lib/calendar/local";

/** today's timed items from the built-in calendar: scheduled tasks and routines */
export function useTodayAgenda(): { items: CalendarItem[]; loading: boolean } {
  const { data: tasks, isLoading: tl } = useTasks();
  const { data: routines, isLoading: rl } = useRoutines();
  const today = todayISO();
  const items = useMemo(() => {
    const buckets = mergeCalendar({
      tasks: tasks ?? [],
      events: [],
      routines: routines ?? [],
      from: today,
      to: today,
    });
    return (buckets.get(today) ?? []).filter((i) => i.time && !i.completed);
  }, [tasks, routines, today]);
  return { items, loading: tl || rl };
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** the next timed item still ahead of now */
export function nextItemOf(items: CalendarItem[], now = new Date()): CalendarItem | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  return items.find((i) => i.time && minutesOf(i.time) > mins) ?? null;
}

export function TodayEvents() {
  const { items, loading } = useTodayAgenda();

  if (loading) return <div className="surface h-24 animate-pulse" aria-hidden />;

  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="surface p-4">
      <p className="eyebrow mb-2.5">Today&apos;s schedule</p>
      {items.length === 0 ? (
        <p className="text-sm text-ink-faint">
          Nothing scheduled.{" "}
          <Link href="/calendar" className="text-accent hover:underline">
            Plan the day
          </Link>
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.slice(0, 6).map((e) => {
            const past = e.time !== null && minutesOf(e.time) < mins;
            return (
              <li key={e.id} className={`flex items-baseline gap-3 ${past ? "opacity-45" : ""}`}>
                <span className="tnum w-11 shrink-0 font-mono text-[12px] text-ink-faint">{e.time}</span>
                <span
                  className="mt-1 h-2 w-0.5 shrink-0 self-stretch rounded-full bg-(--accent)"
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
