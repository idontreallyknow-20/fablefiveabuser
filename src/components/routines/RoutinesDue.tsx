"use client";

import { useMemo } from "react";
import { useRoutines, useRoutineLogs, useLogRoutine } from "@/lib/data/routines";
import { todayISO } from "@/lib/data/tasks";
import { IconCheck } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";

/**
 * Themed reset reminders: the next one or two routines due now, blended
 * quietly into Today. Calm language only; skipping is always fine.
 */
export function RoutinesDue() {
  const { data: routines = [] } = useRoutines();
  const date = todayISO();
  const { data: logs = [] } = useRoutineLogs(date);
  const log = useLogRoutine();
  const { toast } = useToast();

  const due = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const logged = new Set(logs.map((l) => l.routine_id));
    return routines
      .filter((r) => {
        if (!r.enabled || logged.has(r.id)) return false;
        const sched = r.schedule as { times?: string[]; days?: number[] };
        if (sched.days && !sched.days.includes(day)) return false;
        // due when a scheduled time has passed within the last 3 hours
        return (sched.times ?? []).some((t) => {
          if (t > hhmm) return false;
          const [h, m] = t.split(":").map(Number);
          const at = new Date(now);
          at.setHours(h, m, 0, 0);
          return now.getTime() - at.getTime() < 3 * 60 * 60 * 1000;
        });
      })
      .slice(0, 2);
  }, [routines, logs]);

  if (due.length === 0) return null;

  return (
    <div className="surface p-4">
      <p className="eyebrow mb-2.5">When you have a minute</p>
      <div className="flex flex-col gap-1.5">
        {due.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-dim">{r.name}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  await log.mutateAsync({ routineId: r.id, status: "done" });
                  toast("Nice reset", "success");
                }}
                aria-label={`Mark ${r.name} done`}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-bg2 hover:text-ok"
              >
                <IconCheck size={14} />
              </button>
              <button
                onClick={() => log.mutateAsync({ routineId: r.id, status: "skipped" })}
                className="rounded-lg px-2 py-1 text-[12px] text-ink-faint transition-colors hover:bg-bg2 hover:text-ink-dim"
              >
                Skip
              </button>
              <button
                onClick={() => log.mutateAsync({ routineId: r.id, status: "snoozed" })}
                className="rounded-lg px-2 py-1 text-[12px] text-ink-faint transition-colors hover:bg-bg2 hover:text-ink-dim"
              >
                Later
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
