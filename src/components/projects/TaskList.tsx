"use client";

import { useMemo, useState } from "react";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  type Task,
} from "@/lib/data/tasks";
import { projectStatuses, type Project } from "@/lib/data/projects";
import { Button } from "@/components/ui/Button";
import { Confirm } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { IconCheck, IconChevronDown, IconPlus, IconTrash } from "@/components/ui/Icons";
import { LinkChips, selectCls } from "@/components/projects/TaskEditModal";
import { isDoneStatus, statusPatch, taskLinks } from "@/components/projects/task-utils";

function TaskRow({ task, statuses }: { task: Task; statuses: string[] }) {
  const update = useUpdateTask();
  const del = useDeleteTask();

  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(task.note);
  const [newLink, setNewLink] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const done = Boolean(task.completed_at) || isDoneStatus(task.status);
  const links = taskLinks(task);
  const statusOptions = statuses.includes(task.status)
    ? statuses
    : [task.status, ...statuses];

  const toggleDone = () => {
    if (done) {
      update.mutate({
        id: task.id,
        patch: { completed_at: null, status: statuses[0] ?? "todo" },
      });
    } else {
      const finished = statuses.find((s) => isDoneStatus(s)) ?? "done";
      update.mutate({
        id: task.id,
        patch: { completed_at: new Date().toISOString(), status: finished },
      });
    }
  };

  const addLink = () => {
    const url = newLink.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    if (!links.includes(normalized)) {
      update.mutate({ id: task.id, patch: { links: [...links, normalized] } });
    }
    setNewLink("");
  };

  return (
    <div className={`surface transition-opacity duration-[var(--dur-base)] ${done ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          onClick={toggleDone}
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all duration-[var(--dur-base)] ${
            done
              ? "border-(--ok)/60 bg-(--ok)/15 text-ok"
              : "border-line-strong text-transparent hover:border-(--accent)/60 hover:text-accent"
          }`}
        >
          <IconCheck size={12} />
        </button>

        <p className={`min-w-0 flex-1 truncate text-sm text-ink ${done ? "line-through" : ""}`}>
          {task.title}
        </p>

        {task.due_date && (
          <span className="tnum hidden shrink-0 font-mono text-[11px] text-ink-faint sm:inline">
            {task.due_date}
          </span>
        )}
        <span className="tnum hidden shrink-0 font-mono text-[11px] text-ink-faint sm:inline">
          P{task.importance || 2}
        </span>

        <label htmlFor={`status-${task.id}`} className="sr-only">
          Status of {task.title}
        </label>
        <select
          id={`status-${task.id}`}
          value={task.status}
          onChange={(e) => update.mutate({ id: task.id, patch: statusPatch(e.target.value) })}
          className={`${selectCls} !h-8 max-w-28 shrink-0`}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          aria-label={expanded ? `Collapse ${task.title}` : `Expand ${task.title}`}
          aria-expanded={expanded}
          onClick={() => {
            setNote(task.note);
            setExpanded((v) => !v);
          }}
          className={`shrink-0 rounded-lg p-1.5 text-ink-faint transition-all duration-[var(--dur-base)] hover:bg-bg2 hover:text-ink ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <IconChevronDown size={15} />
        </button>

        <button
          aria-label={`Delete ${task.title}`}
          onClick={() => setConfirmDelete(true)}
          className="shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <IconTrash size={15} />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`due-${task.id}`} className="text-[13px] font-medium text-ink-dim">
                Due date
              </label>
              <input
                id={`due-${task.id}`}
                type="date"
                value={task.due_date ?? ""}
                onChange={(e) =>
                  update.mutate({ id: task.id, patch: { due_date: e.target.value || null } })
                }
                className="tnum h-9 rounded-lg border border-line bg-bg1 px-2 font-mono text-[13px] text-ink transition-colors hover:border-line-strong focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">Priority</span>
              <Segmented
                label={`Priority of ${task.title}`}
                size="sm"
                value={String(Math.min(3, Math.max(1, task.importance || 2)))}
                onChange={(v) => update.mutate({ id: task.id, patch: { importance: Number(v) } })}
                options={[
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3", label: "3" },
                ]}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`note-${task.id}`} className="text-[13px] font-medium text-ink-dim">
              Note
            </label>
            <textarea
              id={`note-${task.id}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none rounded-xl border border-line bg-bg1 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong focus:border-(--accent)/50 focus:outline-none"
            />
            {note !== task.note && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  loading={update.isPending}
                  onClick={() => update.mutate({ id: task.id, patch: { note } })}
                >
                  Save note
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <LinkChips
              links={links}
              onRemove={(url) =>
                update.mutate({ id: task.id, patch: { links: links.filter((l) => l !== url) } })
              }
            />
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor={`link-${task.id}`} className="text-[13px] font-medium text-ink-dim">
                  Add a link
                </label>
                <input
                  id={`link-${task.id}`}
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                  placeholder="https://"
                  className="h-9 w-full rounded-lg border border-line bg-bg1 px-2.5 text-[13px] text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong focus:outline-none"
                />
              </div>
              <Button variant="quiet" size="sm" onClick={addLink} aria-label={`Add link to ${task.title}`}>
                <IconPlus size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await del.mutateAsync(task);
        }}
        title="Delete task"
        body={`"${task.title}" will be removed for good.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

export function TaskList({ project, tasks }: { project: Project; tasks: Task[] }) {
  const create = useCreateTask();
  const [title, setTitle] = useState("");

  const statuses = useMemo(() => projectStatuses(project), [project]);

  const sorted = useMemo(() => {
    const open = tasks.filter((t) => !t.completed_at && !isDoneStatus(t.status));
    const closed = tasks.filter((t) => t.completed_at || isDoneStatus(t.status));
    return [...open, ...closed];
  }, [tasks]);

  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const t = title.trim();
          if (!t) return;
          setTitle("");
          await create.mutateAsync({
            title: t,
            project_id: project.id,
            status: statuses[0] ?? "todo",
          });
        }}
        className="mb-3 flex items-center gap-2"
      >
        <label htmlFor="list-add-task" className="sr-only">
          Add a task to {project.name}
        </label>
        <input
          id="list-add-task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          className="h-10 flex-1 rounded-xl border border-transparent bg-transparent px-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line focus:border-line-strong focus:bg-bg1/50 focus:outline-none"
        />
        {title.trim() && (
          <Button type="submit" size="sm" variant="primary" loading={create.isPending}>
            Add
          </Button>
        )}
      </form>

      {sorted.length === 0 ? (
        <p className="px-1 py-6 text-sm text-ink-faint">
          No tasks yet. The first one goes right above.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((t) => (
            <TaskRow key={t.id} task={t} statuses={statuses} />
          ))}
        </div>
      )}
    </div>
  );
}
