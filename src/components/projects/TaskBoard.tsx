"use client";

import { useMemo, useState, type DragEvent } from "react";
import { useCreateTask, useUpdateTask, type Task } from "@/lib/data/tasks";
import { projectStatuses, type Project } from "@/lib/data/projects";
import { Button } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/Icons";
import { isDoneStatus, statusPatch, taskCustom } from "@/components/projects/task-utils";
import { ChecklistBadge } from "@/components/projects/TaskEditModal";

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12.5 4.5L7 10l5.5 5.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7.5 4.5L13 10l-5.5 5.5" />
    </svg>
  );
}

function BoardCard({
  task,
  statuses,
  product,
  onEdit,
  onMove,
}: {
  task: Task;
  statuses: string[];
  product: boolean;
  onEdit: (task: Task) => void;
  onMove: (taskId: string, status: string) => void;
}) {
  const idx = statuses.indexOf(task.status);
  const prev = idx > 0 ? statuses[idx - 1] : null;
  const next = idx >= 0 && idx < statuses.length - 1 ? statuses[idx + 1] : null;
  const custom = product ? taskCustom(task) : null;
  const done = isDoneStatus(task.status);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group surface cursor-grab p-3 transition-opacity duration-[var(--dur-base)] active:cursor-grabbing ${
        done ? "opacity-60" : ""
      }`}
    >
      {custom && custom.next_action && (
        <p className="mb-1 text-[13px] font-medium leading-snug text-accent">
          {custom.next_action}
        </p>
      )}
      <button
        onClick={() => onEdit(task)}
        className="block w-full text-left text-sm leading-snug text-ink transition-colors hover:text-accent"
      >
        {task.title}
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {custom && custom.category && (
          <span className="rounded-full border border-line px-2 py-px font-mono text-[10px] uppercase tracking-wide text-ink-faint">
            {custom.category}
          </span>
        )}
        <span className="tnum font-mono text-[11px] text-ink-faint">P{task.importance || 2}</span>
        {task.due_date && (
          <span className="tnum font-mono text-[11px] text-ink-faint">{task.due_date}</span>
        )}
        <ChecklistBadge task={task} />
        <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-[var(--dur-base)] focus-within:opacity-100 group-hover:opacity-100">
          {prev && (
            <button
              aria-label={`Move ${task.title} to ${prev}`}
              onClick={() => onMove(task.id, prev)}
              className="rounded-md p-1 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
            >
              <ChevronLeft />
            </button>
          )}
          {next && (
            <button
              aria-label={`Move ${task.title} to ${next}`}
              onClick={() => onMove(task.id, next)}
              className="rounded-md p-1 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
            >
              <ChevronRight />
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
  statuses,
  product,
  onEdit,
  onMove,
  onAdd,
  adding,
}: {
  status: string;
  tasks: Task[];
  statuses: string[];
  product: boolean;
  onEdit: (task: Task) => void;
  onMove: (taskId: string, status: string) => void;
  onAdd: (title: string, status: string) => Promise<void>;
  adding: boolean;
}) {
  const [title, setTitle] = useState("");
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMove(id, status);
  };

  return (
    <section
      aria-label={`${status} column`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition-colors duration-[var(--dur-base)] ${
        over ? "border-(--accent)/40 bg-accent-soft" : "border-line bg-bg1/40"
      }`}
    >
      <header className="mb-2 flex items-baseline justify-between px-1.5 pt-1">
        <h3 className="eyebrow">{status}</h3>
        <span className="tnum font-mono text-[11px] text-ink-faint">{tasks.length}</span>
      </header>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const t = title.trim();
          if (!t) return;
          setTitle("");
          await onAdd(t, status);
        }}
        className="mb-2 flex items-center gap-1 px-0.5"
      >
        <label htmlFor={`add-${status}`} className="sr-only">
          Add a task to {status}
        </label>
        <input
          id={`add-${status}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          className="h-8 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-[13px] text-ink placeholder:text-ink-faint transition-colors hover:border-line focus:border-line-strong focus:bg-bg1 focus:outline-none"
        />
        {title.trim() && (
          <Button type="submit" variant="icon" size="sm" aria-label={`Add task to ${status}`} loading={adding}>
            <IconPlus size={14} />
          </Button>
        )}
      </form>

      <div className="flex min-h-16 flex-col gap-2">
        {tasks.map((t) => (
          <BoardCard
            key={t.id}
            task={t}
            statuses={statuses}
            product={product}
            onEdit={onEdit}
            onMove={onMove}
          />
        ))}
        {tasks.length === 0 && (
          <p className="px-1.5 py-3 text-center font-mono text-[12px] text-ink-faint">—</p>
        )}
      </div>
    </section>
  );
}

export function TaskBoard({
  project,
  tasks,
  product = false,
  onEdit,
}: {
  project: Project;
  tasks: Task[];
  /** render NerfChess product extras (next action, category chip) */
  product?: boolean;
  onEdit: (task: Task) => void;
}) {
  const update = useUpdateTask();
  const create = useCreateTask();

  const statuses = useMemo(() => {
    const base = projectStatuses(project);
    const extra = [...new Set(tasks.map((t) => t.status))].filter((s) => !base.includes(s));
    return [...base, ...extra];
  }, [project, tasks]);

  const byStatus = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const s of statuses) m.set(s, []);
    for (const t of tasks) m.get(t.status)?.push(t);
    return m;
  }, [statuses, tasks]);

  const move = (taskId: string, status: string) => {
    const real = tasks.find((t) => t.id === taskId);
    if (!real || real.status === status) return;
    update.mutate({ id: real.id, patch: statusPatch(status) });
  };

  const add = async (title: string, status: string) => {
    await create.mutateAsync({ title, project_id: project.id, status });
  };

  return (
    <div className="-mx-1 flex items-start gap-3 overflow-x-auto px-1 pb-4">
      {statuses.map((s) => (
        <Column
          key={s}
          status={s}
          tasks={byStatus.get(s) ?? []}
          statuses={statuses}
          product={product}
          onEdit={onEdit}
          onMove={move}
          onAdd={add}
          adding={create.isPending}
        />
      ))}
    </div>
  );
}
