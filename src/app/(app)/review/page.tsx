"use client";

// Weekly review: sweep overdue tasks one decision at a time, glance at the
// week ahead, done. No queue left behind.

import { useMemo, useState } from "react";
import Link from "next/link";
import { todayISO, tomorrowISO, useTasks, useTaskActions, useUpdateTask, type Task } from "@/lib/data/tasks";
import { IconCheck, IconChevronRight } from "@/components/ui/Icons";

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ReviewPage() {
  const { data: tasks = [] } = useTasks();
  const update = useUpdateTask();
  const { complete } = useTaskActions();
  const [decided, setDecided] = useState<Set<string>>(new Set());

  const today = todayISO();
  const weekAhead = addDaysISO(7);

  const overdue = useMemo(
    () =>
      tasks.filter(
        (t) => !t.completed_at && t.due_date && t.due_date < today && !decided.has(t.id),
      ),
    [tasks, today, decided],
  );
  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => !t.completed_at && t.due_date && t.due_date >= today && t.due_date <= weekAhead)
        .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)),
    [tasks, today, weekAhead],
  );

  const current: Task | undefined = overdue[0];
  const decide = (task: Task, patch: { due_date?: string | null } | "done") => {
    if (patch === "done") {
      void complete(task);
    } else {
      void update.mutateAsync({ id: task.id, patch });
    }
    setDecided((s) => new Set(s).add(task.id));
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="rise mb-8 mt-[3vh]">
        <p className="eyebrow mb-2">Review</p>
        <h1 className="display text-[28px] text-ink">
          {current ? `${overdue.length} overdue` : "Clear"}
        </h1>
      </header>

      {current && (
        <div className="rise surface p-6" style={{ "--stagger-i": 1 } as React.CSSProperties}>
          <p className="text-[17px] text-ink">{current.title}</p>
          <p className="tnum mt-1 font-mono text-[12px] text-danger">{current.due_date}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => decide(current, "done")}
              className="flex items-center gap-1.5 rounded-xl border border-(--ok)/40 px-3.5 py-2 text-[13px] font-medium text-ok transition-colors hover:bg-(--ok)/10"
            >
              <IconCheck size={13} />
              Done
            </button>
            <button
              onClick={() => decide(current, { due_date: today })}
              className="rounded-xl border border-line px-3.5 py-2 text-[13px] text-ink transition-colors hover:bg-bg1"
            >
              Today
            </button>
            <button
              onClick={() => decide(current, { due_date: tomorrowISO() })}
              className="rounded-xl border border-line px-3.5 py-2 text-[13px] text-ink transition-colors hover:bg-bg1"
            >
              Tomorrow
            </button>
            <button
              onClick={() => decide(current, { due_date: addDaysISO(7) })}
              className="rounded-xl border border-line px-3.5 py-2 text-[13px] text-ink transition-colors hover:bg-bg1"
            >
              Next week
            </button>
            <button
              onClick={() => decide(current, { due_date: null })}
              className="rounded-xl px-3.5 py-2 text-[13px] text-ink-faint transition-colors hover:bg-bg1 hover:text-ink"
            >
              Someday
            </button>
          </div>
        </div>
      )}

      <section className="rise mt-8" style={{ "--stagger-i": 2 } as React.CSSProperties}>
        <p className="eyebrow mb-3">This week</p>
        {upcoming.length === 0 ? (
          <p className="font-mono text-[12px] text-ink-faint">—</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {upcoming.slice(0, 12).map((t) => (
              <li key={t.id} className="surface flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{t.title}</span>
                <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">
                  {t.due_date === today ? "today" : t.due_date!.slice(5)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!current && (
        <div className="rise mt-8" style={{ "--stagger-i": 3 } as React.CSSProperties}>
          <Link
            href="/today"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
          >
            Today
            <IconChevronRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
