"use client";

// AI assistant drawer. Session-local chat; task proposals land as one-tap
// add rows. Silent single-line state when the server key isn't configured.

import { useEffect, useRef, useState } from "react";
import { useAssistant } from "@/lib/assistant/store";
import { useCreateTask, useTasks } from "@/lib/data/tasks";
import { IconCheck, IconPlus, IconSpark } from "@/components/ui/Icons";

interface ProposedTask {
  title: string;
  due_date: string | null;
  notes: string | null;
  added?: boolean;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  tasks?: ProposedTask[];
}

function localISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function AssistantPanel() {
  const open = useAssistant((s) => s.open);
  const setOpen = useAssistant((s) => s.setOpen);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: allTasks = [] } = useTasks();
  const createTask = useCreateTask();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        useAssistant.getState().toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    setInput("");
    const history = [...turns, { role: "user" as const, content }];
    setTurns(history);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          context: {
            date: localISODate(),
            tasks: allTasks
              .filter((t) => !t.completed_at)
              .slice(0, 40)
              .map((t) => ({ title: t.title, due_date: t.due_date, done: false })),
          },
        }),
      });
      const data = (await res.json()) as {
        configured?: boolean;
        text?: string;
        tasks?: ProposedTask[];
        error?: string;
      };
      if (data.configured === false) {
        setConfigured(false);
        setTurns((t) => t.slice(0, -1));
        return;
      }
      if (!res.ok) {
        setTurns((t) => [...t, { role: "assistant", content: "—" }]);
        return;
      }
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: data.text || (data.tasks?.length ? "" : "—"),
          tasks: data.tasks?.length ? data.tasks : undefined,
        },
      ]);
    } catch {
      setTurns((t) => [...t, { role: "assistant", content: "—" }]);
    } finally {
      setBusy(false);
    }
  };

  const addProposed = (turnIdx: number, taskIdx: number) => {
    const task = turns[turnIdx]?.tasks?.[taskIdx];
    if (!task || task.added) return;
    void createTask.mutateAsync({
      title: task.title,
      due_date: task.due_date,
      note: task.notes ?? undefined,
    });
    setTurns((t) =>
      t.map((turn, i) =>
        i === turnIdx
          ? {
              ...turn,
              tasks: turn.tasks?.map((p, j) => (j === taskIdx ? { ...p, added: true } : p)),
            }
          : turn,
      ),
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-label="Assistant">
      <div className="absolute inset-0" onClick={() => setOpen(false)} />
      <div className="floating absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col rounded-none border-l border-line md:bottom-4 md:right-4 md:top-4 md:rounded-2xl md:border">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <IconSpark size={16} className="text-accent" />
          <span className="flex-1 text-[13px] font-medium text-ink">Assistant</span>
          <kbd className="font-mono text-[10px] text-ink-faint">⌘J</kbd>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {!configured && (
            <p className="font-mono text-[12px] text-ink-faint">ANTHROPIC_API_KEY</p>
          )}
          {configured && turns.length === 0 && (
            <p className="font-mono text-[12px] text-ink-faint">—</p>
          )}
          {turns.map((turn, i) => (
            <div key={i} className={turn.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  turn.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-bg2 px-3.5 py-2 text-[13px] text-ink"
                    : "max-w-[92%] text-[13px] leading-relaxed text-ink-dim"
                }
              >
                {turn.content && <p className="whitespace-pre-wrap">{turn.content}</p>}
                {turn.tasks && (
                  <ul className="mt-2 space-y-1">
                    {turn.tasks.map((task, j) => (
                      <li key={j}>
                        <button
                          onClick={() => addProposed(i, j)}
                          disabled={task.added}
                          className={`flex w-full items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-left transition-colors ${
                            task.added ? "opacity-50" : "hover:bg-bg1"
                          }`}
                        >
                          <span className="text-accent">
                            {task.added ? <IconCheck size={13} /> : <IconPlus size={13} />}
                          </span>
                          <span className="flex-1 truncate text-[13px] text-ink">{task.title}</span>
                          {task.due_date && (
                            <span className="tnum font-mono text-[11px] text-ink-faint">
                              {task.due_date.slice(5)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-1 pl-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:300ms]" />
            </div>
          )}
        </div>

        <div className="border-t border-line p-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
              if (e.key === "Escape") setOpen(false);
            }}
            disabled={!configured}
            aria-label="Ask"
            placeholder="Ask"
            className="h-10 w-full rounded-xl bg-bg1 px-3.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
