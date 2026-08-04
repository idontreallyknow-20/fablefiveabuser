"use client";

import { useState } from "react";
import { useDeleteTask, useUpdateTask, type Task } from "@/lib/data/tasks";
import { Modal, Confirm } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { IconPlus } from "@/components/ui/Icons";
import {
  TASK_CATEGORIES,
  customPatch,
  hostOf,
  statusPatch,
  taskCustom,
  taskLinks,
} from "@/components/projects/task-utils";
import { parseRecurrence, type Recurrence } from "@/lib/calendar/recurrence";
import { useTeam } from "@/lib/data/teams";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export function taskChecklist(task: Task): ChecklistItem[] {
  if (!Array.isArray(task.checklist)) return [];
  return (task.checklist as unknown[]).flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const r = v as Record<string, unknown>;
    if (typeof r.text !== "string") return [];
    return [{ id: String(r.id ?? r.text), text: r.text, done: Boolean(r.done) }];
  });
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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

  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState(task.status);
  const [importance, setImportance] = useState(
    String(Math.min(3, Math.max(1, task.importance || 2))),
  );
  const [due, setDue] = useState(task.due_date ?? "");
  const [note, setNote] = useState(task.note);
  const [links, setLinks] = useState<string[]>(() => taskLinks(task));
  const [newLink, setNewLink] = useState("");
  const [tags, setTags] = useState<string[]>(() =>
    Array.isArray(task.tags) ? task.tags : [],
  );
  const [newTag, setNewTag] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => taskChecklist(task));
  const [newStep, setNewStep] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | null>(() =>
    parseRecurrence(task.recurrence),
  );
  const { data: teamData } = useTeam();
  const [teamId, setTeamId] = useState<string | null>(task.team_id ?? null);
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

  const addTag = () => {
    const t = newTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag("");
  };

  const addStep = () => {
    const text = newStep.trim();
    if (!text) return;
    setChecklist([...checklist, { id: crypto.randomUUID(), text, done: false }]);
    setNewStep("");
  };

  const save = async () => {
    const patch = {
      title: title.trim() || task.title,
      importance: Number(importance),
      due_date: due || null,
      note,
      links,
      tags,
      checklist: checklist as unknown as Task["checklist"],
      recurrence: recurrence as unknown as Task["recurrence"],
      team_id: teamId,
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

            {teamData && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-dim">
                  {teamData.team.name || "Team"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={teamId !== null}
                  aria-label="Shared with team"
                  onClick={() => setTeamId(teamId ? null : teamData.team.id)}
                  className={`h-9 rounded-lg border px-3 text-[13px] transition-colors ${
                    teamId
                      ? "border-(--accent)/60 bg-accent-soft text-accent"
                      : "border-line text-ink-faint hover:border-line-strong"
                  }`}
                >
                  {teamId ? "Shared" : "Private"}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-repeat" className="text-[13px] font-medium text-ink-dim">
                Repeat
              </label>
              <select
                id="task-repeat"
                value={recurrence?.freq ?? ""}
                onChange={(e) => {
                  const freq = e.target.value as Recurrence["freq"] | "";
                  setRecurrence(
                    freq === ""
                      ? null
                      : { freq, interval: recurrence?.interval ?? 1, weekdays: recurrence?.weekdays },
                  );
                }}
                className={selectCls}
              >
                <option value="">never</option>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
            </div>
            {recurrence && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-interval" className="text-[13px] font-medium text-ink-dim">
                  Every
                </label>
                <input
                  id="task-interval"
                  type="number"
                  min={1}
                  max={30}
                  value={recurrence.interval}
                  onChange={(e) =>
                    setRecurrence({
                      ...recurrence,
                      interval: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                    })
                  }
                  className={`${selectCls} tnum w-16 font-mono`}
                />
              </div>
            )}
            {recurrence?.freq === "weekly" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-dim">Days</span>
                <div className="flex gap-1">
                  {WEEKDAY_LABELS.map((label, dow) => {
                    const on = recurrence.weekdays?.includes(dow) ?? false;
                    return (
                      <button
                        key={dow}
                        type="button"
                        aria-pressed={on}
                        aria-label={`Weekday ${dow}`}
                        onClick={() => {
                          const cur = recurrence.weekdays ?? [];
                          setRecurrence({
                            ...recurrence,
                            weekdays: on ? cur.filter((d) => d !== dow) : [...cur, dow],
                          });
                        }}
                        className={`tnum h-8 w-8 rounded-lg border font-mono text-[12px] transition-colors ${
                          on
                            ? "border-(--accent)/60 bg-accent-soft text-accent"
                            : "border-line text-ink-faint hover:border-line-strong"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {checklist.length > 0 && (
              <ul className="flex flex-col gap-1">
                {checklist.map((step) => (
                  <li key={step.id} className="group flex items-center gap-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={step.done}
                      aria-label={step.text}
                      onClick={() =>
                        setChecklist(
                          checklist.map((s) =>
                            s.id === step.id ? { ...s, done: !s.done } : s,
                          ),
                        )
                      }
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        step.done
                          ? "border-(--accent)/60 bg-accent-soft text-accent"
                          : "border-line hover:border-line-strong"
                      }`}
                    >
                      {step.done && (
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`flex-1 text-[13.5px] ${step.done ? "text-ink-faint line-through" : "text-ink"}`}
                    >
                      {step.text}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove step ${step.text}`}
                      onClick={() => setChecklist(checklist.filter((s) => s.id !== step.id))}
                      className="rounded-full p-1 text-ink-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field
                  label="Steps"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStep();
                    }
                  }}
                />
              </div>
              <Button variant="quiet" size="md" onClick={addStep} aria-label="Add step">
                <IconPlus size={15} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-bg1 py-0.5 pl-2.5 pr-1 font-mono text-[11.5px] text-ink-dim"
                  >
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field
                  label="Tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
              </div>
              <Button variant="quiet" size="md" onClick={addTag} aria-label="Add tag">
                <IconPlus size={15} />
              </Button>
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
          await del.mutateAsync(task);
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
