"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
  type Project,
} from "@/lib/data/projects";
import { useTasks, useTasksRealtime, type Task } from "@/lib/data/tasks";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal, Confirm } from "@/components/ui/Modal";
import { Segmented, Toggle } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import {
  IconArchive,
  IconChevronRight,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@/components/ui/Icons";
import { isDoneStatus } from "@/components/projects/task-utils";

type Counts = { open: number; done: number };

function countsFor(tasks: Task[], projectId: string): Counts {
  let open = 0;
  let done = 0;
  for (const t of tasks) {
    if (t.project_id !== projectId) continue;
    if (t.completed_at || isDoneStatus(t.status)) done++;
    else open++;
  }
  return { open, done };
}

function ProjectCard({ project, counts }: { project: Project; counts: Counts }) {
  const update = useUpdateProject();
  const del = useDeleteProject();
  const { toast } = useToast();

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const total = counts.open + counts.done;
  const pct = total > 0 ? Math.round((counts.done / total) * 100) : 0;

  const commitRename = () => {
    setRenaming(false);
    const next = name.trim();
    if (next && next !== project.name) {
      update.mutate({ id: project.id, patch: { name: next } });
    } else {
      setName(project.name);
    }
  };

  return (
    <article className={`surface-raised group flex flex-col p-4 ${project.archived ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <>
            <label htmlFor={`rename-${project.id}`} className="sr-only">
              Rename {project.name}
            </label>
            <input
              id={`rename-${project.id}`}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setName(project.name);
                  setRenaming(false);
                }
              }}
              className="h-8 min-w-0 flex-1 rounded-lg border border-line-strong bg-bg1 px-2 text-[15px] text-ink focus:outline-none"
            />
          </>
        ) : (
          <Link
            href={`/projects/${project.id}`}
            className="display min-w-0 flex-1 truncate text-lg text-ink transition-colors hover:text-accent"
          >
            {project.name}
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-[var(--dur-base)] focus-within:opacity-100 group-hover:opacity-100">
          <button
            aria-label={`Rename ${project.name}`}
            onClick={() => {
              setName(project.name);
              setRenaming(true);
            }}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
          >
            <IconEdit size={14} />
          </button>
          <button
            aria-label={project.archived ? `Unarchive ${project.name}` : `Archive ${project.name}`}
            onClick={async () => {
              await update.mutateAsync({ id: project.id, patch: { archived: !project.archived } });
              toast(project.archived ? "Project restored" : "Project archived");
            }}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
          >
            <IconArchive size={14} />
          </button>
          <button
            aria-label={`Delete ${project.name}`}
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span
          className={`tnum font-mono text-[11px] ${project.priority === 1 ? "text-accent" : "text-ink-faint"}`}
          title={`Priority ${project.priority}`}
        >
          P{project.priority}
        </span>
        <span className="tnum font-mono text-[11px] text-ink-faint">
          {counts.open} open
        </span>
        <span className="tnum font-mono text-[11px] text-ink-faint">
          {counts.done} done
        </span>
        {project.archived && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-ink-faint">
            archived
          </span>
        )}
      </div>

      <div
        className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-bg3"
        role="progressbar"
        aria-label={`${project.name} progress`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-(--accent)/70 transition-[width] duration-[var(--dur-slow)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await del.mutateAsync(project.id);
          toast("Project deleted");
        }}
        title="Delete project"
        body={`"${project.name}" and its tasks will be removed for good.`}
        confirmLabel="Delete"
        destructive
      />
    </article>
  );
}

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("2");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await create.mutateAsync({ name: n, kind: "general", priority: Number(priority) });
    setName("");
    setPriority("2");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New project">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-dim">Priority</span>
          <Segmented
            label="Project priority"
            value={priority}
            onChange={setPriority}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
          />
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={create.isPending} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsPage() {
  useTasksRealtime();
  const [showArchived, setShowArchived] = useState(false);
  const { data: projects = [], isLoading } = useProjects(true);
  const { data: tasks = [] } = useTasks();
  const [createOpen, setCreateOpen] = useState(false);

  const visible = useMemo(
    () =>
      projects.filter(
        (p) => p.kind !== "nerf_product" && (showArchived || !p.archived),
      ),
    [projects, showArchived],
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="rise mb-8 mt-[3vh] flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-3xl text-ink">Projects</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <IconPlus size={15} />
          New project
        </Button>
      </header>

      <div className="rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        <Link
          href="/projects/nerfchess"
          className="surface-raised group mb-6 flex items-center justify-between gap-4 p-4 transition-colors duration-[var(--dur-base)] hover:border-line-strong"
        >
          <div>
            <p className="eyebrow mb-1">Pinned</p>
            <p className="display text-lg text-ink transition-colors group-hover:text-accent">
              NerfChess
            </p>
            <p className="mt-0.5 text-[13px] text-ink-faint">
              Product board and marketing pipeline
            </p>
          </div>
          <IconChevronRight size={16} className="shrink-0 text-ink-faint transition-colors group-hover:text-accent" />
        </Link>
      </div>

      <div
        className="rise mb-4 flex items-center justify-between"
        style={{ "--stagger-i": 2 } as React.CSSProperties}
      >
        <h2 className="eyebrow">Your projects</h2>
        <div className="w-44">
          <Toggle checked={showArchived} onChange={setShowArchived} label="Show archived" />
        </div>
      </div>

      <div className="rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
        {!isLoading && visible.length === 0 ? (
          <div className="surface flex items-center justify-center px-5 py-10">
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
              <IconPlus size={14} />
              Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map((p) => (
              <ProjectCard key={p.id} project={p} counts={countsFor(tasks, p.id)} />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
