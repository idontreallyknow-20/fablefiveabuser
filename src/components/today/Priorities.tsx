"use client";

import { useMemo, useState } from "react";
import {
  todayISO,
  usePriorities,
  useTasks,
  useTaskActions,
  useCreateTask,
  useTasksRealtime,
  type Task,
} from "@/lib/data/tasks";
import { useProjects } from "@/lib/data/projects";
import { recommendPriorities } from "@/lib/guide/guide";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import {
  IconCheck,
  IconChevronRight,
  IconDefer,
  IconNote,
  IconPlus,
} from "@/components/ui/Icons";

function PriorityRow({
  slot,
  task,
  onPick,
}: {
  slot: number;
  task: Task | undefined;
  onPick: (slot: number) => void;
}) {
  const actions = useTaskActions();
  const { toast } = useToast();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!task) {
    return (
      <button
        onClick={() => onPick(slot)}
        className="group flex w-full items-center gap-4 rounded-xl border border-dashed border-line px-4 py-4 text-left transition-colors duration-[var(--dur-base)] hover:border-line-strong hover:bg-bg1/40"
      >
        <span className="tnum font-mono text-[13px] text-ink-faint">{slot}</span>
        <span className="text-sm text-ink-faint transition-colors group-hover:text-ink-dim">
          Choose a priority
        </span>
        <IconPlus size={15} className="ml-auto text-ink-faint" />
      </button>
    );
  }

  const done = Boolean(task.completed_at);

  return (
    <div
      className={`group flex items-start gap-4 rounded-xl surface px-4 py-3.5 transition-opacity duration-[var(--dur-base)] ${
        done ? "opacity-55" : ""
      }`}
    >
      <button
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        onClick={async () => {
          if (done) {
            await actions.uncomplete(task);
          } else {
            await actions.complete(task);
            toast("Done. Well placed.", "success", {
              label: "Undo",
              onClick: () => actions.uncomplete(task),
            });
          }
        }}
        className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all duration-[var(--dur-base)] ${
          done
            ? "border-(--ok)/60 bg-(--ok)/15 text-ok"
            : "border-line-strong text-transparent hover:border-(--accent)/60 hover:text-accent"
        }`}
      >
        <IconCheck size={12} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-[15px] leading-snug text-ink ${done ? "line-through" : ""}`}>
          {task.title}
        </p>
        {task.note && <p className="mt-0.5 truncate text-[13px] text-ink-faint">{task.note}</p>}
      </div>

      {!done && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-[var(--dur-base)] focus-within:opacity-100 group-hover:opacity-100">
          <button
            title="Add note"
            aria-label={`Add note to ${task.title}`}
            onClick={() => {
              setNote(task.note);
              setNoteOpen(true);
            }}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
          >
            <IconNote size={15} />
          </button>
          <button
            title="Move to tomorrow"
            aria-label={`Move ${task.title} to tomorrow`}
            onClick={async () => {
              await actions.moveToTomorrow(task);
              toast("Moved to tomorrow");
            }}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
          >
            <IconChevronRight size={15} />
          </button>
          <button
            title="Back to backlog"
            aria-label={`Defer ${task.title} to backlog`}
            onClick={async () => {
              await actions.defer(task);
              toast("Back in the backlog");
            }}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
          >
            <IconDefer size={15} />
          </button>
        </div>
      )}

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Note">
        <TextArea
          label={`Note for "${task.title}"`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="quiet" onClick={() => setNoteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              await actions.setNote(task, note);
              setNoteOpen(false);
            }}
          >
            Save note
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function Priorities() {
  useTasksRealtime();
  const date = todayISO();
  const { data: priorities = [], isLoading } = usePriorities(date);
  const { data: backlog = [] } = useTasks({ backlog: true });
  const { data: projects = [] } = useProjects();
  const actions = useTaskActions();
  const create = useCreateTask();
  const { toast } = useToast();

  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [quickTitle, setQuickTitle] = useState("");

  const bySlot = useMemo(() => {
    const m = new Map<number, Task>();
    for (const t of priorities) if (t.priority_slot) m.set(t.priority_slot, t);
    return m;
  }, [priorities]);

  const recommendations = useMemo(() => {
    const ctx = {
      now: new Date(),
      freeMinutes: null,
      energy: null,
      projectPriority: new Map(projects.map((p) => [p.id, p.priority])),
      completedIds: new Set<string>(),
      focusProjectIds: new Set<string>(),
    };
    const taken = new Set(priorities.map((p) => p.id));
    return recommendPriorities(
      backlog.filter((t) => !taken.has(t.id)),
      ctx,
      3,
    );
  }, [backlog, priorities, projects]);

  const pick = async (task: Task) => {
    if (pickerSlot === null) return;
    await actions.promote(task, pickerSlot, date);
    setPickerSlot(null);
  };

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    setQuickTitle("");
    if (pickerSlot !== null) {
      const created = await create.mutateAsync({
        title,
        priority_slot: pickerSlot,
        priority_date: date,
      });
      if (created) setPickerSlot(null);
    } else {
      await create.mutateAsync({ title });
      toast("Added to backlog");
    }
  };

  return (
    <section aria-label="Today's priorities">
      <h2 className="eyebrow mb-3">Three priorities</h2>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((slot, i) => (
          <div key={slot} className="rise" style={{ "--stagger-i": i } as React.CSSProperties}>
            <PriorityRow slot={slot} task={bySlot.get(slot)} onPick={setPickerSlot} />
          </div>
        ))}
      </div>

      <Modal
        open={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        title={`Priority ${pickerSlot ?? ""}`}
        wide
      >
        {recommendations.length > 0 && (
          <div className="mb-5">
            <p className="eyebrow mb-2">Guide suggests</p>
            <div className="flex flex-col gap-1.5">
              {recommendations.map((r) => (
                <button
                  key={r.task.id}
                  onClick={() => pick(r.task)}
                  className="flex flex-col items-start gap-0.5 rounded-xl border border-(--accent)/25 bg-accent-soft px-3.5 py-2.5 text-left transition-colors hover:border-(--accent)/45"
                >
                  <span className="text-sm text-ink">{r.task.title}</span>
                  {r.reasons.length > 0 && (
                    <span className="text-[12px] text-ink-faint">{r.reasons.join(" · ")}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="eyebrow mb-2">Backlog</p>
        {backlog.length === 0 ? (
          <p className="py-3 text-sm text-ink-faint">
            The backlog is empty. Add the first task below.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              {backlog.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pick(t)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink-dim transition-colors hover:bg-bg1 hover:text-ink"
                >
                  <span className="truncate">{t.title}</span>
                  {t.due_date && (
                    <span className="tnum ml-3 shrink-0 font-mono text-[11px] text-ink-faint">
                      {t.due_date}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={quickAdd} className="mt-4 flex gap-2">
          <div className="flex-1">
            <Field
              label="New task"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" className="mt-[26px]" loading={create.isPending}>
            Add
          </Button>
        </form>
      </Modal>

      {!isLoading && (
        <form onSubmit={quickAdd} className="mt-3 flex items-center gap-2">
          <label htmlFor="quick-add" className="sr-only">
            Add a task to the backlog
          </label>
          <input
            id="quick-add"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add to backlog"
            className="h-10 flex-1 rounded-xl border border-transparent bg-transparent px-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line focus:border-line-strong focus:bg-bg1/50 focus:outline-none"
          />
          {quickTitle.trim() && (
            <Button type="submit" size="sm" variant="primary" loading={create.isPending}>
              Add
            </Button>
          )}
        </form>
      )}
    </section>
  );
}
