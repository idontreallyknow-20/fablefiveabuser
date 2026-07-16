"use client";

import { useState } from "react";
import {
  useCreateRoutine,
  useDeleteRoutine,
  useRoutineHistory,
  useRoutines,
  useUpdateRoutine,
  type Routine,
} from "@/lib/data/routines";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal, Confirm } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function ScheduleEditor({
  routine,
  onSave,
}: {
  routine: Routine;
  onSave: (schedule: { times: string[]; days: number[] }) => void;
}) {
  const sched = routine.schedule as { times?: string[]; days?: number[] };
  const [times, setTimes] = useState<string[]>(sched.times ?? []);
  const [days, setDays] = useState<number[]>(sched.days ?? [0, 1, 2, 3, 4, 5, 6]);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-dim">Days</p>
        <div className="flex gap-1.5" role="group" aria-label="Days of the week">
          {DAYS.map((d, i) => (
            <button
              key={i}
              aria-pressed={days.includes(i)}
              aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]}
              onClick={() =>
                setDays((prev) =>
                  prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort(),
                )
              }
              className={`h-9 w-9 rounded-lg border text-[13px] font-medium transition-colors ${
                days.includes(i)
                  ? "border-(--accent)/50 bg-accent-soft text-accent"
                  : "border-line text-ink-faint hover:border-line-strong"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-dim">Times</p>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t, i) => (
            <span key={i} className="flex items-center gap-1 rounded-lg border border-line bg-bg1 px-2 py-1">
              <input
                type="time"
                value={t}
                onChange={(e) =>
                  setTimes((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                }
                className="tnum bg-transparent font-mono text-[13px] text-ink"
                aria-label={`Time ${i + 1}`}
              />
              <button
                aria-label="Remove time"
                onClick={() => setTimes((prev) => prev.filter((_, j) => j !== i))}
                className="px-1 text-ink-faint hover:text-danger"
              >
                ×
              </button>
            </span>
          ))}
          <Button size="sm" variant="quiet" onClick={() => setTimes((p) => [...p, "20:00"])}>
            Add time
          </Button>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => onSave({ times, days })}>
          Save schedule
        </Button>
      </div>
    </div>
  );
}

export default function RoutinesPage() {
  const { data: routines = [] } = useRoutines();
  const { data: history = [] } = useRoutineHistory(30);
  const create = useCreateRoutine();
  const update = useUpdateRoutine();
  const remove = useDeleteRoutine();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Routine | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);

  const doneByRoutine = new Map<string, number>();
  for (const log of history) {
    if (log.status === "done") {
      doneByRoutine.set(log.routine_id, (doneByRoutine.get(log.routine_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="surface p-5" aria-label="Routines">
        <h2 className="eyebrow mb-1">Reset routines</h2>
        <p className="mb-4 max-w-lg text-sm text-ink-faint">
          Small resets that keep the room and the day in order. They appear quietly on
          Today when due; skipping is always fine.
        </p>
        <div className="divide-y divide-(--line)">
          {routines.map((r) => {
            const sched = r.schedule as { times?: string[]; days?: number[] };
            const done30 = doneByRoutine.get(r.id) ?? 0;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className={`text-sm ${r.enabled ? "text-ink" : "text-ink-faint line-through"}`}>
                    {r.name}
                  </p>
                  <p className="tnum font-mono text-[11.5px] text-ink-faint">
                    {(sched.times ?? []).join(" · ") || "No time set"}
                    {done30 > 0 ? ` · ${done30}× this month` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="quiet" onClick={() => setEditing(r)}>
                    Schedule
                  </Button>
                  <Toggle
                    checked={r.enabled}
                    onChange={(enabled) => update.mutate({ id: r.id, patch: { enabled } })}
                    label={`Enable ${r.name}`}
                  />
                  {!r.slug && (
                    <Button size="sm" variant="quiet" onClick={() => setDeleting(r)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            await create.mutateAsync({
              name: newName.trim(),
              category: "reset",
              schedule: { times: ["20:00"], days: [0, 1, 2, 3, 4, 5, 6] },
              sort_order: routines.length + 1,
            });
            setNewName("");
            toast("Routine added", "success");
          }}
          className="mt-4 flex items-end gap-2"
        >
          <div className="flex-1">
            <Field label="New routine" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <Button type="submit" variant="primary" className="mb-[0px]" loading={create.isPending}>
            Add
          </Button>
        </form>
      </section>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.name ?? ""}>
        {editing && (
          <ScheduleEditor
            routine={editing}
            onSave={async (schedule) => {
              await update.mutateAsync({ id: editing.id, patch: { schedule } });
              setEditing(null);
              toast("Schedule saved", "success");
            }}
          />
        )}
      </Modal>

      <Confirm
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
        }}
        title="Remove routine"
        body="Its history goes with it. The built-in routines can be disabled instead."
        confirmLabel="Remove"
        destructive
      />
    </div>
  );
}
