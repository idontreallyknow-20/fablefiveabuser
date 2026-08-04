"use client";

// Skincare checklist: today's skincare routines with one-tap logging.

import { useMemo } from "react";
import { todayISO } from "@/lib/data/tasks";
import { useLogRoutine, useRoutineLogs, useRoutines } from "@/lib/data/routines";
import { IconCheck } from "@/components/ui/Icons";

export function SkincareWidget() {
  const { data: routines = [] } = useRoutines();
  const { data: logs = [] } = useRoutineLogs(todayISO());
  const logRoutine = useLogRoutine();

  const items = useMemo(
    () => routines.filter((r) => r.enabled && r.category === "skincare"),
    [routines],
  );
  const doneIds = useMemo(
    () => new Set(logs.filter((l) => l.status === "done").map((l) => l.routine_id)),
    [logs],
  );

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Skincare</h2>
      <ul className="flex flex-1 flex-col justify-center gap-1.5">
        {items.map((r) => {
          const done = doneIds.has(r.id);
          return (
            <li key={r.id} className="flex items-center gap-2.5">
              <button
                aria-label={`${r.name} done`}
                aria-pressed={done}
                disabled={done}
                onClick={() => logRoutine.mutate({ routineId: r.id, status: "done" })}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  done
                    ? "border-(--accent)/60 bg-accent-soft text-accent"
                    : "border-line text-transparent hover:border-(--accent)/60 hover:text-accent"
                }`}
              >
                <IconCheck size={11} />
              </button>
              <span
                className={`truncate text-[13px] ${done ? "text-ink-faint line-through" : "text-ink-dim"}`}
              >
                {r.name}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
