"use client";

import Link from "next/link";
import { useMemo } from "react";
import { todayISO, useTasks, useTaskActions, type Task } from "@/lib/data/tasks";
import { IconCalendar, IconCheck } from "@/components/ui/Icons";

function addDaysISO(base: string, n: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function dueLabel(due: string, today: string): string {
  if (due < today) return "overdue";
  if (due === today) return "today";
  if (due === addDaysISO(today, 1)) return "tomorrow";
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

export function DueSoon() {
  const { data: tasks = [] } = useTasks();
  const { complete } = useTaskActions();
  const today = todayISO();

  const due = useMemo(() => {
    const horizon = addDaysISO(todayISO(), 7);
    return tasks
      .filter((t) => !t.completed_at && t.due_date && t.due_date <= horizon)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
      .slice(0, 6);
  }, [tasks]);

  if (due.length === 0) return null;

  return (
    <section aria-label="Due soon" className="surface rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="eyebrow">Due soon</h2>
        <Link
          href="/calendar"
          aria-label="Open calendar"
          className="text-ink-faint transition-colors hover:text-ink"
        >
          <IconCalendar size={15} />
        </Link>
      </div>
      <ul className="flex flex-col gap-1">
        {due.map((t: Task) => {
          const overdue = t.due_date! < today;
          return (
            <li key={t.id} className="group flex items-center gap-2.5">
              <button
                aria-label={`Complete ${t.title}`}
                onClick={() => complete(t)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-transparent transition-colors hover:border-(--accent)/60 hover:text-accent"
              >
                <IconCheck size={11} />
              </button>
              <span className="flex-1 truncate text-[13.5px] text-ink-dim">{t.title}</span>
              <span
                className={`tnum shrink-0 font-mono text-[11px] ${
                  overdue ? "text-[color:var(--danger,#C4574E)]" : "text-ink-faint"
                }`}
              >
                {dueLabel(t.due_date!, today)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
