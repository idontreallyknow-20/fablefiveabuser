"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  projectStatuses,
  useProject,
  useUpdateProject,
  type Project,
} from "@/lib/data/projects";
import { useTasks, useTasksRealtime, type Task } from "@/lib/data/tasks";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { IconArchive } from "@/components/ui/Icons";
import { TaskList } from "@/components/projects/TaskList";
import { TaskBoard } from "@/components/projects/TaskBoard";
import { TaskEditModal } from "@/components/projects/TaskEditModal";
import {
  MilestoneTimeline,
  MilestonesEditorModal,
  StatusesEditorModal,
} from "@/components/projects/ProjectEditors";

function ProjectHeader({ project, tasks }: { project: Project; tasks: Task[] }) {
  const update = useUpdateProject();
  const { toast } = useToast();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [statusesOpen, setStatusesOpen] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);

  // re-sync the drafts when fresh server data arrives (render-time derived state)
  const [synced, setSynced] = useState({ name: project.name, description: project.description });
  if (synced.name !== project.name || synced.description !== project.description) {
    setSynced({ name: project.name, description: project.description });
    setName(project.name);
    setDescription(project.description);
  }

  const commitName = () => {
    const next = name.trim();
    if (next && next !== project.name) {
      update.mutate({ id: project.id, patch: { name: next } });
    } else {
      setName(project.name);
    }
  };

  const commitDescription = () => {
    if (description !== project.description) {
      update.mutate({ id: project.id, patch: { description } });
    }
  };

  return (
    <header className="rise">
      <Link
        href="/projects"
        className="eyebrow inline-block transition-colors hover:text-ink-dim"
      >
        Projects
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="project-name" className="sr-only">
            Project name
          </label>
          <input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setName(project.name);
            }}
            className="display w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-3xl text-ink transition-colors hover:border-line focus:border-line-strong focus:outline-none"
          />
          <label htmlFor="project-description" className="sr-only">
            Project description
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            rows={description ? 2 : 1}
            placeholder="What is this about"
            className="mt-1 w-full resize-none rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink-dim placeholder:text-ink-faint transition-colors hover:border-line focus:border-line-strong focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Project priority"
            size="sm"
            value={String(Math.min(3, Math.max(1, project.priority || 2)))}
            onChange={(v) => update.mutate({ id: project.id, patch: { priority: Number(v) } })}
            options={[
              { value: "1", label: "P1" },
              { value: "2", label: "P2" },
              { value: "3", label: "P3" },
            ]}
          />
          <Button variant="quiet" size="sm" onClick={() => setStatusesOpen(true)}>
            Statuses
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setMilestonesOpen(true)}>
            Milestones
          </Button>
          <Button
            variant="quiet"
            size="sm"
            aria-label={project.archived ? "Unarchive project" : "Archive project"}
            onClick={async () => {
              await update.mutateAsync({
                id: project.id,
                patch: { archived: !project.archived },
              });
              toast(project.archived ? "Project restored" : "Project archived");
            }}
          >
            <IconArchive size={14} />
            {project.archived ? "Unarchive" : "Archive"}
          </Button>
        </div>
      </div>

      <MilestoneTimeline project={project} />

      <StatusesEditorModal
        project={project}
        tasks={tasks}
        open={statusesOpen}
        onClose={() => setStatusesOpen(false)}
      />
      <MilestonesEditorModal
        project={project}
        open={milestonesOpen}
        onClose={() => setMilestonesOpen(false)}
      />
    </header>
  );
}

export default function ProjectDetailPage() {
  useTasksRealtime();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: project, isLoading } = useProject(params.id);
  const { data: tasks = [] } = useTasks({ projectId: params.id });

  const [view, setView] = useState<"list" | "board">("list");
  const [editing, setEditing] = useState<Task | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl py-16">
        <p className="eyebrow">Loading</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-3 py-16">
        <p className="text-sm text-ink-dim">This project does not exist anymore.</p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mt-[3vh]">
        <ProjectHeader project={project} tasks={tasks} />
      </div>

      <div
        className="rise mb-4 mt-8 flex items-center justify-between"
        style={{ "--stagger-i": 1 } as React.CSSProperties}
      >
        <h2 className="eyebrow">Tasks</h2>
        <Segmented
          label="Task view"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "List" },
            { value: "board", label: "Board" },
          ]}
        />
      </div>

      <div className="rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
        {view === "list" ? (
          <TaskList project={project} tasks={tasks} />
        ) : (
          <TaskBoard project={project} tasks={tasks} onEdit={setEditing} />
        )}
      </div>

      <TaskEditModal
        task={editing}
        statuses={projectStatuses(project)}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
