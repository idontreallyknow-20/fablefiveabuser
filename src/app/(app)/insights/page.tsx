"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/data/tasks";
import { useAllEntries } from "@/lib/data/fitness";
import { completionsPerDay, topTags } from "@/lib/insights/compute";
import { Bars } from "@/components/insights/charts";
import {
  BalanceWidget,
  MomentumWidget,
  TrainingWidget,
  WeekShapeWidget,
  useNow,
} from "@/components/insights/InsightWidgets";

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function Card({
  className,
  stagger,
  children,
}: {
  className?: string;
  stagger: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`surface rise rounded-2xl p-5 ${className ?? ""}`}
      style={{ "--stagger-i": stagger } as React.CSSProperties}
    >
      {children}
    </section>
  );
}

function ThirtyDays() {
  const { data: tasks = [] } = useTasks();
  const now = useNow();
  const series = useMemo(
    () => (now === null ? [] : completionsPerDay(tasks, 30, new Date(now))),
    [tasks, now],
  );

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-3">Last 30 days</h2>
      <div className="min-h-0 flex-1">
        <Bars values={series.map((p) => p.count)} highlight={series.length - 1} />
      </div>
      <div className="mt-1.5 flex shrink-0 justify-between">
        <span className="tnum font-mono text-[10px] uppercase text-ink-faint">
          {series.length > 0 ? fmtDay(series[0].date) : ""}
        </span>
        <span className="tnum font-mono text-[10px] uppercase text-accent">
          {series.length > 0 ? fmtDay(series[series.length - 1].date) : ""}
        </span>
      </div>
    </div>
  );
}

function TopTags() {
  const { data: tasks = [] } = useTasks();
  const tags = useMemo(() => topTags(tasks, 4), [tasks]);
  const max = Math.max(1, ...tags.map((t) => t.count));

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Top tags</h2>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-1">
        {tags.map((t) => (
          <div key={t.tag}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] text-ink-dim">{t.tag}</span>
              <span className="tnum font-mono text-[11px] text-ink-faint">{t.count}</span>
            </div>
            <svg
              viewBox="0 0 100 4"
              preserveAspectRatio="none"
              className="mt-1 block h-1 w-full"
              aria-hidden
            >
              <rect x={0} y={0} width={100} height={4} rx={2} fill="var(--bg2)" />
              <rect
                x={0}
                y={0}
                width={(t.count / max) * 100}
                height={4}
                rx={2}
                fill="var(--accent)"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { data: tasks = [] } = useTasks();
  // warm the entries cache so the training card fills in with the rest
  useAllEntries();
  const now = useNow();
  const range = useMemo(() => {
    if (now === null) return "";
    const series = completionsPerDay(tasks, 30, new Date(now));
    return `${fmtDay(series[0].date)} – ${fmtDay(series[series.length - 1].date)}`;
  }, [tasks, now]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="rise mb-8 mt-[3vh]">
        <p className="eyebrow mb-2">{range}</p>
        <h1 className="display text-[28px] text-ink">Insights</h1>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="h-[230px] md:col-span-7" stagger={1}>
          <MomentumWidget />
        </Card>
        <Card className="h-[230px] md:col-span-5" stagger={2}>
          <BalanceWidget />
        </Card>
        <Card className="h-[250px] md:col-span-12" stagger={3}>
          <ThirtyDays />
        </Card>
        <Card className="h-[220px] md:col-span-4" stagger={4}>
          <WeekShapeWidget />
        </Card>
        <Card className="h-[220px] md:col-span-4" stagger={5}>
          <TrainingWidget />
        </Card>
        <Card className="h-[220px] md:col-span-4" stagger={6}>
          <TopTags />
        </Card>
      </div>
    </div>
  );
}
