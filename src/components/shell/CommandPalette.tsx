"use client";

// Command palette (⌘K): navigate, switch themes, search tasks, and
// capture new ones with natural-language dates.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { THEME_LIST, type ThemeId } from "@/lib/themes/registry";
import { useSettings } from "@/lib/settings/store";
import { useCreateTask, useTasks, useTaskActions, type Task } from "@/lib/data/tasks";
import { parseEntry } from "@/lib/nlp/date";
import { useAssistant } from "@/lib/assistant/store";
import { TaskEditModal } from "@/components/projects/TaskEditModal";
import { IconCheck } from "@/components/ui/Icons";

interface Item {
  id: string;
  kind: "page" | "theme" | "task" | "create";
  label: string;
  hint: string | null;
  run: () => void;
  task?: Task;
}

const PAGES: { label: string; href: string }[] = [
  { label: "Today", href: "/today" },
  { label: "Projects", href: "/projects" },
  { label: "Calendar", href: "/calendar" },
  { label: "Insights", href: "/insights" },
  { label: "Review", href: "/review" },
  { label: "Capture", href: "/capture" },
  { label: "Music", href: "/music" },
  { label: "Train", href: "/train" },
  { label: "Reflect", href: "/reflect" },
  { label: "Sounds", href: "/sounds" },
  { label: "Focus", href: "/focus" },
  { label: "Ambient", href: "/ambient" },
  { label: "Settings", href: "/space" },
  { label: "Team", href: "/space/team" },
  { label: "Appearance", href: "/space/appearance" },
  { label: "Connections", href: "/space/connections" },
];

function score(label: string, q: string): number {
  const l = label.toLowerCase();
  if (l === q) return 3;
  if (l.startsWith(q)) return 2;
  if (l.includes(q)) return 1;
  return 0;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState<Task | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const set = useSettings((s) => s.set);
  const { data: tasks = [] } = useTasks();
  const createTask = useCreateTask();
  const { complete } = useTaskActions();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setCursor(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Item[] = [];

    if (q) {
      const parsed = parseEntry(query);
      out.push({
        id: "create",
        kind: "create",
        label: `Add "${parsed.title || query}"`,
        hint: parsed.dueDate,
        run: () => {
          void createTask.mutateAsync({
            title: parsed.title || query.trim(),
            due_date: parsed.dueDate,
            scheduled_at: parsed.scheduledAt,
          });
          close();
        },
      });
    }

    if (!q || score("assistant", q) > 0 || score("ask", q) > 0) {
      out.push({
        id: "assistant",
        kind: "page",
        label: "Assistant",
        hint: "⌘J",
        run: () => {
          useAssistant.getState().setOpen(true);
          close();
        },
      });
    }

    const pages = PAGES.map((p) => ({ p, s: q ? score(p.label, q) : 1 }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, q ? 4 : 6)
      .map(({ p }) => ({
        id: `page:${p.href}`,
        kind: "page" as const,
        label: p.label,
        hint: null,
        run: () => {
          router.push(p.href);
          close();
        },
      }));
    out.push(...pages);

    if (q) {
      const themes = THEME_LIST.map((t) => ({ t, s: score(`theme ${t.name}`, q) || score(t.name, q) }))
        .filter(({ s }) => s > 0)
        .slice(0, 3)
        .map(({ t }) => ({
          id: `theme:${t.id}`,
          kind: "theme" as const,
          label: t.name,
          hint: "theme",
          run: () => {
            set({ theme: t.id as ThemeId });
            close();
          },
        }));
      out.push(...themes);

      const matched = tasks
        .filter((t) => !t.completed_at && t.title.toLowerCase().includes(q))
        .slice(0, 5)
        .map((t) => ({
          id: `task:${t.id}`,
          kind: "task" as const,
          label: t.title,
          hint: t.due_date,
          task: t,
          run: () => {
            setEditing(t);
            setOpen(false);
          },
        }));
      out.push(...matched);
    }

    return out;
  }, [query, tasks, router, set, createTask, close]);

  const clampedCursor = Math.min(cursor, Math.max(0, items.length - 1));

  if (!open && !editing) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 pt-[16vh]"
          onClick={close}
          role="dialog"
          aria-label="Command palette"
        >
          <div
            className="floating w-full max-w-lg overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(items.length - 1, c + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(0, c - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  items[clampedCursor]?.run();
                }
              }}
              aria-label="Command"
              placeholder="Type a task, page, or theme"
              className="h-13 w-full border-b border-line bg-transparent px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <ul className="max-h-[46vh] overflow-y-auto py-1.5">
              {items.map((item, i) => (
                <li key={item.id}>
                  <button
                    onClick={item.run}
                    onMouseEnter={() => setCursor(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      i === clampedCursor ? "bg-bg2" : ""
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                        item.kind === "create" ? "text-accent" : "text-ink-faint"
                      }`}
                    >
                      {item.kind === "create" ? "add" : item.kind === "page" ? "go" : item.kind}
                    </span>
                    <span className="flex-1 truncate text-[14px] text-ink">{item.label}</span>
                    {item.hint && (
                      <span className="tnum font-mono text-[11px] text-ink-faint">{item.hint}</span>
                    )}
                    {item.kind === "task" && item.task && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Complete ${item.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void complete(item.task!);
                          close();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            void complete(item.task!);
                            close();
                          }
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-transparent transition-colors hover:border-(--accent)/60 hover:text-accent"
                      >
                        <IconCheck size={11} />
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-4 py-3 font-mono text-[12px] text-ink-faint">—</li>
              )}
            </ul>
          </div>
        </div>
      )}
      <TaskEditModal
        task={editing}
        statuses={["todo", "doing", "done"]}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
