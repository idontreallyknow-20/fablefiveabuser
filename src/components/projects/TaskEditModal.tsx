"use client";

import { useState } from "react";
import { useDeleteTask, useUpdateTask, type Task } from "@/lib/data/tasks";
import { Modal, Confirm } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { IconPlus } from "@/components/ui/Icons";
import {
  TASK_CATEGORIES,
  customPatch,
  hostOf,
  statusPatch,
  taskCustom,
  taskLinks,
} from "@/components/projects/task-utils";

export const selectCls =
  "h-9 rounded-lg border border-line bg-bg1 px-2 text-[13px] text-ink " +
  "transition-colors duration-[var(--dur-base)] hover:border-line-strong focus:outline-none";

export function LinkChips({
  links,
  onRemove,
}: {
  links: string[];
  onRemove: (url: string) => void;
}) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((url) => (
        <span
          key={url}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-bg1 py-0.5 pl-2.5 pr-1 text-[12px] text-ink-dim"
        >
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="max-w-40 truncate hover:text-accent"
          >
            {hostOf(url)}
          </a>
          <button
            type="button"
            aria-label={`Remove link ${url}`}
            onClick={() => onRemove(url)}
            className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}

export function TaskEditModal({
  task,
  statuses,
  product = false,
  onClose,
}: {
  task: Task | null;
  statuses: string[];
  /** show NerfChess product fields (category, next action) */
  product?: boolean;
  onClose: () => void;
}) {
  if (!task) return null;
  return (
    <TaskEditForm
      key={task.id}
      task={task}
      statuses={statuses}
      product={product}
      onClose={onClose}
    />
  );
}

function TaskEditForm({
  task,
  statuses,
  product,
  onClose,
}: {
  task: Task;
  statuses: string[];
  product: boolean;
  onClose: () => void;
}) {
  const update = useUpdateTask();
  const del = useDeleteTask();
  const { toast } = useToast();

  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState(task.status);
  const [importance, setImportance] = useState(
    String(Math.min(3, Math.max(1, task.importance || 2))),
  );
  const [due, setDue] = useState(task.due_date ?? "");
  const [note, setNote] = useState(task.note);
  const [links, setLinks] = useState<string[]>(() => taskLinks(task));
  const [newLink, setNewLink] = useState("");
  const [category, setCategory] = useState(() => taskCustom(task).category);
  const [nextAction, setNextAction] = useState(() => taskCustom(task).next_action);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addLink = () => {
    const url = newLink.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    if (!links.includes(normalized)) setLinks([...links, normalized]);
    setNewLink("");
  };

  const save = async () => {
    const patch = {
      title: title.trim() || task.title,
      importance: Number(importance),
      due_date: due || null,
      note,
      links,
      ...(status !== task.status ? statusPatch(status) : {}),
      ...(product
        ? { custom: customPatch(task, { category, next_action: nextAction.trim() }) }
        : {}),
    };
    await update.mutateAsync({ id: task.id, patch });
    onClose();
  };

  const statusOptions = statuses.includes(task.status)
    ? statuses
    : [task.status, ...statuses];

  return (
    <>
      <Modal open onClose={onClose} title="Task" wide>
        <div className="flex flex-col gap-4">
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

          {product && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-next-action" className="text-[13px] font-medium text-ink-dim">
                Next action
              </label>
              <input
                id="task-next-action"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="h-11 w-full rounded-xl border border-(--accent)/30 bg-accent-soft px-3.5 text-accent placeholder:text-ink-faint transition-colors duration-[var(--dur-base)] hover:border-(--accent)/50 focus:border-(--accent)/60 focus:outline-none"
              />
              <p className="text-[13px] text-ink-faint">The single next step that moves this forward.</p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-status" className="text-[13px] font-medium text-ink-dim">
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectCls}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {product && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-category" className="text-[13px] font-medium text-ink-dim">
                  Category
                </label>
                <select
                  id="task-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectCls}
                >
                  <option value="">none</option>
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">Priority</span>
              <Segmented
                label="Task priority"
                size="sm"
                value={importance}
                onChange={setImportance}
                options={[
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3", label: "3" },
                ]}
              />
            </div>

            <div className="w-40">
              <Field
                label="Due date"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="tnum font-mono !h-9 text-[13px]"
              />
            </div>
          </div>

          <TextArea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />

          <div className="flex flex-col gap-2">
            <LinkChips links={links} onRemove={(url) => setLinks(links.filter((l) => l !== url))} />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field
                  label="Add a link"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                  placeholder="https://"
                />
              </div>
              <Button variant="quiet" size="md" onClick={addLink} aria-label="Add link">
                <IconPlus size={15} />
              </Button>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-2">
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="quiet" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save} loading={update.isPending}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await del.mutateAsync(task.id);
          toast("Task deleted");
          onClose();
        }}
        title="Delete task"
        body={`"${task.title}" will be removed for good.`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
