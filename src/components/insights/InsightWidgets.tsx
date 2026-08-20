"use client";

// Insight widgets for the Today grid. Each is self-contained (ignores
// per-instance props) and reads the user's own data through the shared
// query hooks; the math lives in src/lib/insights/compute.ts.

import { useMemo, useSyncExternalStore } from "react";
import { useTasks } from "@/lib/data/tasks";
import { useAllEntries } from "@/lib/data/fitness";
import {
  completionsByWeekday,
  completionsPerDay,
  currentStreak,
  openVsDone,
  workoutVolumePerWeek,
} from "@/lib/insights/compute";
import { Bars, RingGauge, Sparkline } from "@/components/insights/charts";

/** wall-clock timestamp, minute resolution; null during SSR */
export function useNow(): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 60_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  );
}

export const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/* -------------------------------------------------------------- momentum -- */

export function MomentumWidget() {
  const { data: tasks = [] } = useTasks();
  const now = useNow();
  const { series, streak } = useMemo(() => {
    if (now === null) return { series: [] as number[], streak: 0 };
    const d = new Date(now);
    return {
      series: completionsPerDay(tasks, 14, d).map((p) => p.count),
      streak: currentStreak(tasks, d),
    };
  }, [tasks, now]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-1">Momentum</h2>
      <p className="display tnum text-[30px] font-medium leading-none text-ink">
        {streak}
        <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          day streak
        </span>
      </p>
      <div className="mt-2 min-h-0 flex-1">
        <Sparkline values={series} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ week shape -- */

export function WeekShapeWidget() {
  const { data: tasks = [] } = useTasks();
  const now = useNow();
  const { counts, todayIdx } = useMemo(() => {
    if (now === null) return { counts: [0, 0, 0, 0, 0, 0, 0], todayIdx: -1 };
    const d = new Date(now);
    return {
      counts: completionsByWeekday(tasks, 4, d),
      todayIdx: (d.getDay() + 6) % 7,
    };
  }, [tasks, now]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Week shape</h2>
      <div className="min-h-0 flex-1">
        <Bars values={counts} labels={WEEKDAY_LETTERS} highlight={todayIdx} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- balance -- */

export function BalanceWidget() {
  const { data: tasks = [] } = useTasks();
  const now = useNow();
  const stats = useMemo(
    () => (now === null ? { open: 0, done: 0, overdue: 0 } : openVsDone(tasks, new Date(now))),
    [tasks, now],
  );
  const total = stats.open + stats.done;
  const ratio = total > 0 ? stats.done / total : 0;

  const cell = (label: string, value: number, danger = false) => (
    <div>
      <p
        className={`display tnum text-[24px] font-medium leading-none ${
          danger && value > 0 ? "text-[color:#C4574E]" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </p>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Balance</h2>
      <div className="flex flex-1 items-center gap-5">
        <div className="grid flex-1 grid-cols-1 content-center gap-3">
          {cell("open", stats.open)}
          {cell("done", stats.done)}
          {cell("late", stats.overdue, true)}
        </div>
        <RingGauge value={ratio} className="max-h-full w-[42%] max-w-[104px] shrink-0">
          <span className="tnum font-mono text-[13px] text-ink">
            {Math.round(ratio * 100)}
            <span className="text-ink-faint">%</span>
          </span>
        </RingGauge>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- training -- */

export function TrainingWidget() {
  const { data: entries = [] } = useAllEntries();
  const now = useNow();
  const weeks = useMemo(
    () => (now === null ? [] : workoutVolumePerWeek(entries, 6, new Date(now))),
    [entries, now],
  );
  const thisWeek = weeks.length > 0 ? weeks[weeks.length - 1].volume : 0;

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-1">Training</h2>
      <p className="display tnum text-[30px] font-medium leading-none text-ink">
        {Math.round(thisWeek)}
        <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          vol this week
        </span>
      </p>
      <div className="mt-2 min-h-0 flex-1">
        <Bars
          values={weeks.map((w) => w.volume)}
          highlight={weeks.length - 1}
        />
      </div>
    </div>
  );
}
