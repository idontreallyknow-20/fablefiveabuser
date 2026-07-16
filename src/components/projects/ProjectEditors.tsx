"use client";

import { useState } from "react";
import type { Json } from "@/lib/db/types";
import { projectStatuses, useUpdateProject, type Project } from "@/lib/data/projects";
import { useUpdateTask, type Task } from "@/lib/data/tasks";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { IconCheck, IconPlus, IconTrash } from "@/components/ui/Icons";

/* ---------------------------------------------------------------------------
   Milestones: projects.milestones jsonb, [{ title, due, done }]
--------------------------------------------------------------------------- */

export type Milestone = { title: string; due: string | null; done: boolean };

export function projectMilestones(p: Project): Milestone[] {
  if (!Array.isArray(p.milestones)) return [];
  const out: Milestone[] = [];
  for (const m of p.milestones) {
    if (!m || typeof m !== "object" || Array.isArray(m)) continue;
    const o = m as { [key: string]: Json | undefined };
    if (typeof o.title !== "string") continue;
    out.push({
      title: o.title,
      due: typeof o.due === "string" && o.due ? o.due : null,
      done: o.done === true,
    });
  }
  return out;
}

export function MilestoneTimeline({ project }: { project: Project }) {
  const update = useUpdateProject();
  const milestones = projectMilestones(project);
  if (milestones.length === 0) return null;

  const toggle = (index: number) => {
    const next = milestones.map((m, i) => (i === index ? { ...m, done: !m.done } : m));
    update.mutate({ id: project.id, patch: { milestones: next as unknown as Json } });
  };

  return (
    <section aria-label="Milestones" className="mt-5">
      <h2 className="eyebrow mb-2">Milestones</h2>
      <ol className="border-l border-line pl-4">
        {milestones.map((m, i) => (
          <li key={`${m.title}-${i}`} className="relative flex items-baseline gap-3 py-1.5">
            <button
              aria-label={m.done ? `Reopen milestone ${m.title}` : `Complete milestone ${m.title}`}
              onClick={() => toggle(i)}
              className={`absolute -left-[23px] top-[9px] flex h-[14px] w-[14px] items-center justify-center rounded-full border transition-colors duration-[var(--dur-base)] ${
                m.done
                  ? "border-(--ok)/60 bg-(--ok)/20 text-ok"
                  : "border-line-strong bg-bg0 text-transparent hover:border-(--accent)/60"
              }`}
            >
              <IconCheck size={8} />
            </button>
            <span className={`text-sm ${m.done ? "text-ink-faint line-through" : "text-ink-dim"}`}>
              {m.title}
            </span>
            {m.due && (
              <span className="tnum ml-auto shrink-0 font-mono text-[11px] text-ink-faint">
                {m.due}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MilestonesEditorModal({
  project,
  open,
  onClose,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <MilestonesEditorForm project={project} onClose={onClose} />;
}

function MilestonesEditorForm({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const update = useUpdateProject();
  const { toast } = useToast();
  const [rows, setRows] = useState<Milestone[]>(() => projectMilestones(project));

  const set = (i: number, patch: Partial<Milestone>) =>
    setRows((r) => r.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const save = async () => {
    const cleaned = rows
      .map((m) => ({ ...m, title: m.title.trim() }))
      .filter((m) => m.title.length > 0);
    await update.mutateAsync({
      id: project.id,
      patch: { milestones: cleaned as unknown as Json },
    });
    toast("Milestones saved");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Milestones" wide>
      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="py-2 text-sm text-ink-faint">
            Milestones mark the shape of a project. Add the first one below.
          </p>
        )}
        {rows.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              aria-label={m.done ? `Mark ${m.title || "milestone"} not done` : `Mark ${m.title || "milestone"} done`}
              onClick={() => set(i, { done: !m.done })}
              className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border transition-colors duration-[var(--dur-base)] ${
                m.done
                  ? "border-(--ok)/60 bg-(--ok)/15 text-ok"
                  : "border-line-strong text-transparent hover:border-(--accent)/60"
              }`}
            >
              <IconCheck size={11} />
            </button>
            <label htmlFor={`ms-title-${i}`} className="sr-only">
              Milestone {i + 1} title
            </label>
            <input
              id={`ms-title-${i}`}
              value={m.title}
              onChange={(e) => set(i, { title: e.target.value })}
              placeholder="Milestone"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-bg1 px-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong focus:outline-none"
            />
            <label htmlFor={`ms-due-${i}`} className="sr-only">
              Milestone {i + 1} due date
            </label>
            <input
              id={`ms-due-${i}`}
              type="date"
              value={m.due ?? ""}
              onChange={(e) => set(i, { due: e.target.value || null })}
              className="tnum h-9 shrink-0 rounded-lg border border-line bg-bg1 px-2 font-mono text-[12px] text-ink transition-colors hover:border-line-strong focus:outline-none"
            />
            <button
              aria-label={`Remove milestone ${m.title || i + 1}`}
              onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <IconTrash size={15} />
            </button>
          </div>
        ))}
        <div>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => setRows((r) => [...r, { title: "", due: null, done: false }])}
          >
            <IconPlus size={14} />
            Add milestone
          </Button>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={update.isPending}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------------
   Custom statuses: projects.statuses jsonb, string[]
--------------------------------------------------------------------------- */

type StatusRow = { key: number; original: string | null; name: string };

export function StatusesEditorModal({
  project,
  tasks,
  open,
  onClose,
}: {
  project: Project;
  tasks: Task[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return <StatusesEditorForm project={project} tasks={tasks} onClose={onClose} />;
}

function StatusesEditorForm({
  project,
  tasks,
  onClose,
}: {
  project: Project;
  tasks: Task[];
  onClose: () => void;
}) {
  const update = useUpdateProject();
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const [rows, setRows] = useState<StatusRow[]>(() =>
    projectStatuses(project).map((s, i) => ({ key: i, original: s, name: s })),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleaned = rows
      .map((r) => ({ ...r, name: r.name.trim() }))
      .filter((r) => r.name.length > 0);
    if (cleaned.length === 0) return;
    const names = [...new Set(cleaned.map((r) => r.name))];

    setSaving(true);
    try {
      await update.mutateAsync({ id: project.id, patch: { statuses: names as unknown as Json } });

      // keep tasks consistent: follow renames, fold removed statuses into the first
      const rename = new Map<string, string>();
      for (const r of cleaned) {
        if (r.original && r.original !== r.name) rename.set(r.original, r.name);
      }
      const moves: Promise<unknown>[] = [];
      for (const t of tasks) {
        const renamed = rename.get(t.status);
        if (renamed) {
          moves.push(updateTask.mutateAsync({ id: t.id, patch: { status: renamed } }));
        } else if (!names.includes(t.status)) {
          moves.push(updateTask.mutateAsync({ id: t.id, patch: { status: names[0] } }));
        }
      }
      await Promise.all(moves);
      toast("Statuses saved");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Statuses">
      <p className="mb-3 text-[13px] text-ink-faint">
        Board columns, in order. Renames carry tasks along; removed columns fold into the first.
      </p>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="tnum w-5 shrink-0 text-right font-mono text-[11px] text-ink-faint">
              {i + 1}
            </span>
            <label htmlFor={`st-${r.key}`} className="sr-only">
              Status {i + 1} name
            </label>
            <input
              id={`st-${r.key}`}
              value={r.name}
              onChange={(e) =>
                setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))
              }
              placeholder="status"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-bg1 px-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong focus:outline-none"
            />
            <button
              aria-label={`Remove status ${r.name || i + 1}`}
              disabled={rows.length <= 1}
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
            >
              <IconTrash size={15} />
            </button>
          </div>
        ))}
        <div>
          <Button
            variant="quiet"
            size="sm"
            onClick={() =>
              setRows((rs) => [
                ...rs,
                { key: Math.max(0, ...rs.map((x) => x.key)) + 1, original: null, name: "" },
              ])
            }
          >
            <IconPlus size={14} />
            Add status
          </Button>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
