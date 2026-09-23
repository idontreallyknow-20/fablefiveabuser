// The built-in calendar: one merged, date-bucketed stream of tasks,
// timed events, and routine schedules.

import type { Task } from "@/lib/data/tasks";
import { expandRecurrence, parseRecurrence } from "@/lib/calendar/recurrence";

/** a timed or all-day event from an outside calendar */
export interface OrbitEvent {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  color: string | null;
  calendarId: string;
}

export interface CalendarItem {
  /** unique within the merged stream */
  id: string;
  kind: "task" | "event" | "routine";
  title: string;
  /** YYYY-MM-DD bucket in local time */
  date: string;
  /** HH:MM when timed */
  time: string | null;
  allDay: boolean;
  color: string | null;
  completed: boolean;
  tags: string[];
  /** underlying row id for actions */
  sourceId: string;
  /** projected from a recurrence (not a real row on that date) */
  ghost: boolean;
}

export interface RoutineLike {
  id: string;
  name: string;
  enabled: boolean;
  schedule: unknown;
}

function localDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function taskTags(t: Task): string[] {
  return Array.isArray(t.tags) ? t.tags : [];
}

/** every date key from `from` to `to` inclusive (both YYYY-MM-DD, local) */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cur <= end && out.length < 400) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Merge tasks + events + routines into per-date buckets over [from, to].
 * Buckets are sorted: all-day first, then by time, then title.
 */
export function mergeCalendar(input: {
  tasks: Task[];
  events: OrbitEvent[];
  routines: RoutineLike[];
  from: string;
  to: string;
}): Map<string, CalendarItem[]> {
  const { tasks, events, routines, from, to } = input;
  const buckets = new Map<string, CalendarItem[]>();
  const push = (item: CalendarItem) => {
    const list = buckets.get(item.date);
    if (list) list.push(item);
    else buckets.set(item.date, [item]);
  };

  for (const t of tasks) {
    const tags = taskTags(t);
    const completed = Boolean(t.completed_at);
    if (t.scheduled_at) {
      const date = localDate(t.scheduled_at);
      if (date >= from && date <= to) {
        push({
          id: `task:${t.id}:sched`,
          kind: "task",
          title: t.title,
          date,
          time: localTime(t.scheduled_at),
          allDay: false,
          color: null,
          completed,
          tags,
          sourceId: t.id,
          ghost: false,
        });
      }
    }
    if (t.due_date && t.due_date >= from && t.due_date <= to) {
      push({
        id: `task:${t.id}:due`,
        kind: "task",
        title: t.title,
        date: t.due_date,
        time: null,
        allDay: true,
        color: null,
        completed,
        tags,
        sourceId: t.id,
        ghost: false,
      });
    }
    // recurrence projections from the due-date anchor
    const rec = parseRecurrence(t.recurrence);
    if (rec && t.due_date) {
      for (const date of expandRecurrence(rec, t.due_date, from, to)) {
        if (date === t.due_date) continue; // the real row already covers it
        push({
          id: `task:${t.id}:rec:${date}`,
          kind: "task",
          title: t.title,
          date,
          time: null,
          allDay: true,
          color: null,
          completed: false,
          tags,
          sourceId: t.id,
          ghost: true,
        });
      }
    }
  }

  for (const e of events) {
    if (!e.startsAt) continue;
    const date = localDate(e.startsAt);
    if (date < from || date > to) continue;
    push({
      id: `event:${e.id}`,
      kind: "event",
      title: e.title || "(untitled)",
      date,
      time: e.allDay ? null : localTime(e.startsAt),
      allDay: e.allDay,
      color: e.color,
      completed: false,
      tags: [],
      sourceId: e.id,
      ghost: false,
    });
  }

  for (const r of routines) {
    if (!r.enabled) continue;
    const sched = (r.schedule ?? {}) as { times?: string[]; days?: number[] };
    const days = Array.isArray(sched.days) ? sched.days : [];
    const times = Array.isArray(sched.times) ? sched.times : [];
    if (days.length === 0 || times.length === 0) continue;
    for (const date of dateRange(from, to)) {
      if (!days.includes(weekdayOf(date))) continue;
      for (const time of times) {
        push({
          id: `routine:${r.id}:${date}:${time}`,
          kind: "routine",
          title: r.name,
          date,
          time,
          allDay: false,
          color: null,
          completed: false,
          tags: [],
          sourceId: r.id,
          ghost: false,
        });
      }
    }
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      if (a.time !== b.time) return (a.time ?? "").localeCompare(b.time ?? "");
      return a.title.localeCompare(b.title);
    });
  }
  return buckets;
}
