// Pure insight computations over the user's own data. Everything here is
// deterministic given a `now`, works in local time, and never touches the
// network — so it can be unit-tested with plain fixtures.

import type { Task } from "@/lib/data/tasks";
import type { WorkoutEntry } from "@/lib/data/fitness";

/** the slice of a task the insight math needs */
export type TaskFacts = Pick<Task, "completed_at" | "due_date" | "tags">;

/** the slice of a workout entry the volume math needs */
export type VolumeEntry = Pick<WorkoutEntry, "created_at" | "weight_kg" | "reps">;

export interface DayCount {
  /** local YYYY-MM-DD */
  date: string;
  count: number;
}

export interface WeekVolume {
  /** local YYYY-MM-DD of the week's Monday */
  week: string;
  volume: number;
}

/* ------------------------------------------------------------- date math -- */

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** local calendar key; timestamps with or without zone both land on the local day */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday index 0 .. Sunday index 6 */
function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function mondayOf(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -weekdayIndex(s));
}

function completionDays(tasks: TaskFacts[]): Map<string, number> {
  const per = new Map<string, number>();
  for (const t of tasks) {
    if (!t.completed_at) continue;
    const d = new Date(t.completed_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    per.set(key, (per.get(key) ?? 0) + 1);
  }
  return per;
}

/* ----------------------------------------------------------- completions -- */

/** completions per local day for the last `days` days, oldest first, ending today */
export function completionsPerDay(
  tasks: TaskFacts[],
  days: number,
  now: Date = new Date(),
): DayCount[] {
  const per = completionDays(tasks);
  const today = startOfDay(now);
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(addDays(today, -i));
    out.push({ date: key, count: per.get(key) ?? 0 });
  }
  return out;
}

/** completion counts bucketed Mon..Sun over the trailing `weeks * 7` days */
export function completionsByWeekday(
  tasks: TaskFacts[],
  weeks: number,
  now: Date = new Date(),
): number[] {
  const today = startOfDay(now);
  const start = addDays(today, -(weeks * 7 - 1));
  const end = addDays(today, 1);
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const t of tasks) {
    if (!t.completed_at) continue;
    const d = new Date(t.completed_at);
    if (Number.isNaN(d.getTime())) continue;
    if (d < start || d >= end) continue;
    out[weekdayIndex(d)] += 1;
  }
  return out;
}

/**
 * Consecutive days with at least one completion, counting back from today.
 * A streak that has not been extended yet today still counts (it may end
 * yesterday); several completions on one day count once.
 */
export function currentStreak(tasks: TaskFacts[], now: Date = new Date()): number {
  const per = completionDays(tasks);
  const today = startOfDay(now);
  let cursor = per.has(dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (per.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Open vs done, plus how many of the open ones are past due. Overdue tasks
 * are counted in `open` too — `overdue` is the subset that slipped.
 */
export function openVsDone(
  tasks: TaskFacts[],
  now: Date = new Date(),
): { open: number; done: number; overdue: number } {
  const today = dayKey(startOfDay(now));
  let open = 0;
  let done = 0;
  let overdue = 0;
  for (const t of tasks) {
    if (t.completed_at) {
      done += 1;
      continue;
    }
    open += 1;
    if (t.due_date && t.due_date < today) overdue += 1;
  }
  return { open, done, overdue };
}

/* -------------------------------------------------------------- training -- */

/**
 * Training volume per week (Monday-keyed), oldest first, ending with the
 * current week. A set with both weight and reps contributes weight * reps;
 * anything else counts as one set, so bodyweight work still registers.
 */
export function workoutVolumePerWeek(
  entries: VolumeEntry[],
  weeks: number,
  now: Date = new Date(),
): WeekVolume[] {
  const currentMonday = mondayOf(now);
  const index = new Map<string, number>();
  const out: WeekVolume[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const key = dayKey(addDays(currentMonday, -7 * i));
    index.set(key, out.length);
    out.push({ week: key, volume: 0 });
  }
  for (const e of entries) {
    const d = new Date(e.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const slot = index.get(dayKey(mondayOf(d)));
    if (slot === undefined) continue;
    const load =
      e.weight_kg != null && e.weight_kg > 0 && e.reps != null && e.reps > 0
        ? e.weight_kg * e.reps
        : 1;
    out[slot].volume += load;
  }
  return out;
}

/* ------------------------------------------------------------------ tags -- */

/** most frequent tags across completed tasks, count desc then name asc */
export function topTags(
  tasks: TaskFacts[],
  limit = 6,
): { tag: string; count: number }[] {
  const per = new Map<string, number>();
  for (const t of tasks) {
    if (!t.completed_at) continue;
    for (const tag of t.tags ?? []) {
      const clean = tag.trim();
      if (!clean) continue;
      per.set(clean, (per.get(clean) ?? 0) + 1);
    }
  }
  return [...per.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
