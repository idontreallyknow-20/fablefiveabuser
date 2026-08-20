"use client";

import { useMemo, useState } from "react";
import { useCreateTask, useTaskActions, type Task } from "@/lib/data/tasks";
import { useTeamTasks, type TeamMember } from "@/lib/data/teams";
import { parseEntry } from "@/lib/nlp/date";
import { Button } from "@/components/ui/Button";
import { IconCheck } from "@/components/ui/Icons";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function Row({ task, initial, owner }: { task: Task; initial: string; owner: string }) {
  const actions = useTaskActions();
  const done = Boolean(task.completed_at);

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl surface px-3.5 py-2.5 transition-opacity duration-[var(--dur-base)] ${
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
          }
        }}
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-all duration-[var(--dur-base)] ${
          done
            ? "border-(--ok)/60 bg-(--ok)/15 text-ok"
            : "border-line-strong text-transparent hover:border-(--accent)/60 hover:text-accent"
        }`}
      >
        <IconCheck size={12} />
      </button>

      <p
        className={`min-w-0 flex-1 truncate text-[14.5px] leading-snug text-ink ${
          done ? "line-through" : ""
        }`}
      >
        {task.title}
      </p>

      {task.due_date && !done && (
        <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">{task.due_date}</span>
      )}

      <span
        title={owner}
        aria-label={owner}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg2 font-mono text-[10.5px] uppercase text-ink-dim"
      >
        {initial}
      </span>
    </div>
  );
}

export function SharedTasks({ teamId, members }: { teamId: string; members: TeamMember[] }) {
  const { data: tasks = [], dataUpdatedAt } = useTeamTasks(teamId);
  const create = useCreateTask();
  const [value, setValue] = useState("");

  const byUser = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);

  const { open, recent } = useMemo(() => {
    const open = tasks
      .filter((t) => !t.completed_at)
      .sort((a, b) => {
        if (a.due_date !== b.due_date) {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date < b.due_date ? -1 : 1;
        }
        return a.created_at < b.created_at ? -1 : 1;
      });
    const cutoff = dataUpdatedAt - WEEK_MS;
    const recent = tasks
      .filter((t) => t.completed_at && new Date(t.completed_at).getTime() >= cutoff)
      .sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1));
    return { open, recent };
  }, [tasks, dataUpdatedAt]);

  const parsed = parseEntry(value);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
    const p = parseEntry(trimmed);
    await create.mutateAsync({
      title: p.title || trimmed,
      due_date: p.dueDate,
      scheduled_at: p.scheduledAt,
      team_id: teamId,
    });
  };

  return (
    <section aria-label="Shared tasks" className="surface rounded-2xl p-5">
      <h2 className="eyebrow mb-3">Shared</h2>

      <form onSubmit={add} className="mb-3 flex items-center gap-2">
        <label htmlFor="shared-add" className="sr-only">
          Add a shared task
        </label>
        <input
          id="shared-add"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add shared task"
          autoComplete="off"
          className="h-10 flex-1 rounded-xl border border-transparent bg-transparent px-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line focus:border-line-strong focus:bg-bg1/50 focus:outline-none"
        />
        {value.trim() && parsed.dueDate && (
          <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">{parsed.dueDate}</span>
        )}
        {value.trim() && (
          <Button type="submit" size="sm" variant="primary" loading={create.isPending}>
            Add
          </Button>
        )}
      </form>

      <div className="flex flex-col gap-1.5">
        {open.map((t) => {
          const m = t.user_id ? byUser.get(t.user_id) : undefined;
          return (
            <Row
              key={t.id}
              task={t}
              initial={(m?.display_name || "?").slice(0, 1)}
              owner={m?.display_name || "…"}
            />
          );
        })}
        {recent.length > 0 && (
          <>
            {open.length > 0 && <div className="my-1.5 border-t border-line" />}
            {recent.map((t) => {
              const m = t.user_id ? byUser.get(t.user_id) : undefined;
              return (
                <Row
                  key={t.id}
                  task={t}
                  initial={(m?.display_name || "?").slice(0, 1)}
                  owner={m?.display_name || "…"}
                />
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
