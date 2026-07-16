"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  projectStatuses,
  useCreateProject,
  useProjects,
  type Project,
} from "@/lib/data/projects";
import { useTasks, useTasksRealtime, type Task } from "@/lib/data/tasks";
import {
  NERF_STAGES,
  parseMetrics,
  stageIndex,
  useCreateNerfItem,
  useMoveNerfStage,
  useNerfItems,
  useNerfRealtime,
  type NerfItem,
  type NerfStage,
} from "@/lib/data/nerf";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { TaskBoard } from "@/components/projects/TaskBoard";
import { TaskEditModal } from "@/components/projects/TaskEditModal";
import { ContentEditor } from "@/components/nerf/ContentEditor";
import { NerfAnalytics } from "@/components/nerf/Analytics";

const intFmt = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });

/* ---------------------------------------------------------------------------
   Product area: a fixed-status board on the 'nerf_product' project
--------------------------------------------------------------------------- */

function ProductBoard({ project }: { project: Project }) {
  const { data: tasks = [] } = useTasks({ projectId: project.id });
  const [editing, setEditing] = useState<Task | null>(null);

  return (
    <>
      <TaskBoard project={project} tasks={tasks} product onEdit={setEditing} />
      <TaskEditModal
        task={editing}
        statuses={projectStatuses(project)}
        product
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function ProductArea() {
  const { data: projects, isSuccess } = useProjects(true);
  const create = useCreateProject();
  const creatingRef = useRef(false);

  const product = projects?.find((p) => p.kind === "nerf_product");

  useEffect(() => {
    if (isSuccess && !product && !creatingRef.current) {
      creatingRef.current = true;
      create.mutate({ name: "NerfChess Product", kind: "nerf_product" });
    }
  }, [isSuccess, product, create]);

  if (!product) {
    return <p className="eyebrow py-10">Preparing the product board</p>;
  }

  return <ProductBoard project={product} />;
}

/* ---------------------------------------------------------------------------
   Marketing area: the nerf_content pipeline
--------------------------------------------------------------------------- */

function StageRail({
  items,
  stage,
  onSelect,
}: {
  items: NerfItem[];
  stage: NerfStage;
  onSelect: (s: NerfStage) => void;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.stage, (m.get(i.stage) ?? 0) + 1);
    return m;
  }, [items]);

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div
        role="radiogroup"
        aria-label="Pipeline stage"
        className="flex w-max items-center gap-1"
      >
        {NERF_STAGES.map((s, i) => {
          const active = s === stage;
          return (
            <span key={s} className="flex items-center gap-1">
              {i > 0 && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="shrink-0 text-ink-faint"
                  aria-hidden
                >
                  <path d="M7.5 4.5L13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <button
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(s)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors duration-[var(--dur-base)] ${
                  active
                    ? "border-line-strong bg-bg2 text-ink"
                    : "border-transparent text-ink-faint hover:text-ink-dim"
                }`}
              >
                {s}
                <span className="tnum font-mono text-[11px] text-ink-faint">
                  {counts.get(s) ?? 0}
                </span>
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MarketingCard({
  item,
  onEdit,
}: {
  item: NerfItem;
  onEdit: (item: NerfItem) => void;
}) {
  const { move } = useMoveNerfStage();
  const idx = stageIndex(item.stage);
  const prev = idx > 0 ? NERF_STAGES[idx - 1] : null;
  const next = idx >= 0 && idx < NERF_STAGES.length - 1 ? NERF_STAGES[idx + 1] : null;
  const metrics = parseMetrics(item.metrics);
  const title = item.hook.trim() || item.concept.trim() || "Untitled idea";

  return (
    <div className="surface group p-4">
      {item.next_action && (
        <p className="mb-1 text-sm font-medium leading-snug text-accent">{item.next_action}</p>
      )}
      <button
        onClick={() => onEdit(item)}
        className="block w-full text-left text-[15px] leading-snug text-ink transition-colors hover:text-accent"
      >
        {title}
      </button>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {item.platforms.map((p) => (
          <span
            key={p}
            className="rounded-full border border-line px-2 py-px font-mono text-[10px] uppercase tracking-wide text-ink-faint"
          >
            {p}
          </span>
        ))}
        {item.format && (
          <span className="font-mono text-[11px] text-ink-faint">{item.format}</span>
        )}
        {item.publish_date && (
          <span className="tnum font-mono text-[11px] text-ink-faint">{item.publish_date}</span>
        )}
        {metrics.views > 0 && (
          <span className="tnum font-mono text-[11px] text-ink-faint">
            {intFmt.format(metrics.views)} views
          </span>
        )}

        <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-[var(--dur-base)] focus-within:opacity-100 group-hover:opacity-100">
          {prev && (
            <button
              aria-label={`Move back to ${prev}`}
              onClick={() => move(item, prev)}
              className="rounded-md p-1 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12.5 4.5L7 10l5.5 5.5" />
              </svg>
            </button>
          )}
          {next && (
            <button
              aria-label={`Move on to ${next}`}
              onClick={() => move(item, next)}
              className="rounded-md p-1 text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7.5 4.5L13 10l-5.5 5.5" />
              </svg>
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

function MarketingArea() {
  useNerfRealtime();
  const { data: items = [], isLoading } = useNerfItems();
  const create = useCreateNerfItem();

  const [stage, setStage] = useState<NerfStage>("idea");
  const [newHook, setNewHook] = useState("");
  const [editing, setEditing] = useState<NerfItem | null>(null);

  const stageItems = useMemo(() => items.filter((i) => i.stage === stage), [items, stage]);
  // keep the open editor in sync with fresh data
  const editingItem = editing ? (items.find((i) => i.id === editing.id) ?? editing) : null;

  return (
    <div>
      <StageRail items={items} stage={stage} onSelect={setStage} />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const hook = newHook.trim();
          if (!hook) return;
          setNewHook("");
          await create.mutateAsync({ hook, stage });
        }}
        className="mb-3 mt-4 flex items-center gap-2"
      >
        <label htmlFor="nerf-add" className="sr-only">
          Add a content idea to {stage}
        </label>
        <input
          id="nerf-add"
          value={newHook}
          onChange={(e) => setNewHook(e.target.value)}
          placeholder={`Add to ${stage}`}
          className="h-10 flex-1 rounded-xl border border-transparent bg-transparent px-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line focus:border-line-strong focus:bg-bg1/50 focus:outline-none"
        />
        {newHook.trim() && (
          <Button type="submit" size="sm" variant="primary" loading={create.isPending}>
            Add
          </Button>
        )}
      </form>

      {!isLoading && stageItems.length === 0 ? (
        <p className="px-1 py-6 text-sm text-ink-faint">
          Nothing in {stage} right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {stageItems.map((i) => (
            <MarketingCard key={i.id} item={i} onEdit={setEditing} />
          ))}
        </div>
      )}

      <NerfAnalytics items={items} />

      <ContentEditor item={editingItem} onClose={() => setEditing(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Page
--------------------------------------------------------------------------- */

export default function NerfChessPage() {
  useTasksRealtime();
  const [area, setArea] = useState<"product" | "marketing">("product");

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="rise mb-6 mt-[3vh]">
        <Link
          href="/projects"
          className="eyebrow inline-block transition-colors hover:text-ink-dim"
        >
          Projects
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-3xl text-ink">NerfChess</h1>
            <p className="mt-1 text-sm text-ink-faint">
              Build the thing, then tell people about it.
            </p>
          </div>
          <Segmented
            label="NerfChess area"
            value={area}
            onChange={setArea}
            options={[
              { value: "product", label: "Product" },
              { value: "marketing", label: "Marketing" },
            ]}
          />
        </div>
      </header>

      <div className="rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        {area === "product" ? <ProductArea /> : <MarketingArea />}
      </div>
    </div>
  );
}
