"use client";

// Self-contained small widgets for the Today grid. Each receives its
// per-instance props plus an onProps patcher that persists to the layout.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { todayISO, useTasks } from "@/lib/data/tasks";
import { useRoutineHistory, useRoutines } from "@/lib/data/routines";
import { useWeather } from "@/lib/weather/useWeather";

export interface WidgetProps {
  props: Record<string, unknown>;
  onProps: (patch: Record<string, unknown>) => void;
  /** grid edit mode is active */
  editing: boolean;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** wall-clock timestamp, minute resolution; null during SSR */
function useNow(): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 60_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => null,
  );
}

/* ---------------------------------------------------------------- notes -- */

export function NotesWidget({ props, onProps }: WidgetProps) {
  const [text, setText] = useState(() => str(props.text));
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const change = (v: string) => {
    setText(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onProps({ text: v }), 600);
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Notes</h2>
      <textarea
        value={text}
        onChange={(e) => change(e.target.value)}
        aria-label="Notes"
        className="min-h-0 flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------ countdown -- */

export function CountdownWidget({ props, onProps, editing }: WidgetProps) {
  const target = str(props.date);
  const label = str(props.label);
  const now = useNow();
  const days = useMemo(() => {
    if (!target || now === null) return null;
    const [y, m, d] = target.split("-").map(Number);
    const t = new Date(y, m - 1, d).getTime();
    return Math.ceil((t - now) / 86_400_000);
  }, [target, now]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-1">Countdown</h2>
      {editing || !target ? (
        <div className="flex flex-col gap-1.5">
          <input
            type="date"
            value={target}
            onChange={(e) => onProps({ date: e.target.value })}
            aria-label="Countdown date"
            className="tnum h-8 rounded-lg border border-line bg-bg1 px-2 font-mono text-[12px] text-ink focus:outline-none"
          />
          <input
            value={label}
            onChange={(e) => onProps({ label: e.target.value })}
            aria-label="Countdown label"
            placeholder="Label"
            className="h-8 rounded-lg border border-line bg-bg1 px-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <p className="display tnum text-[38px] font-medium leading-none text-ink">
            {days ?? ""}
            <span className="ml-1.5 text-[15px] text-ink-faint">d</span>
          </p>
          {label && <p className="mt-1 truncate text-[13px] text-ink-dim">{label}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- pomodoro -- */

const POM_PRESETS = [25, 50, 5, 10] as const;

export function PomodoroWidget() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = seconds > 0 ? 1 - left / seconds : 0;

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-1">Timer</h2>
      <div className="flex flex-1 items-center justify-between gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          aria-pressed={running}
          aria-label={running ? "Pause timer" : "Start timer"}
          className="display tnum text-left text-[34px] font-medium leading-none text-ink transition-opacity hover:opacity-80"
        >
          {mm}:{ss}
        </button>
        <div className="flex flex-col items-end gap-1">
          {POM_PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => {
                setSeconds(m * 60);
                setLeft(m * 60);
                setRunning(false);
              }}
              className={`tnum rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors ${
                seconds === m * 60 ? "text-accent" : "text-ink-faint hover:text-ink"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-bg2">
        <div
          className="h-full rounded-full bg-(--accent) transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- stats -- */

export function StatsWidget() {
  const { data: tasks = [] } = useTasks();
  const now = useNow();
  const today = todayISO();
  const stats = useMemo(() => {
    const weekAgo = new Date((now ?? 0) - 6 * 86_400_000).toISOString();
    const doneToday = tasks.filter((t) => t.completed_at?.startsWith(today)).length;
    const doneWeek = tasks.filter((t) => t.completed_at && t.completed_at >= weekAgo).length;
    const open = tasks.filter((t) => !t.completed_at).length;
    const overdue = tasks.filter(
      (t) => !t.completed_at && t.due_date && t.due_date < today,
    ).length;
    return { doneToday, doneWeek, open, overdue };
  }, [tasks, today, now]);

  const cell = (label: string, value: number, danger = false) => (
    <div>
      <p className={`display tnum text-[26px] font-medium leading-none ${danger && value > 0 ? "text-[color:#C4574E]" : "text-ink"}`}>
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">{label}</p>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Tasks</h2>
      <div className="grid flex-1 grid-cols-2 content-center gap-x-4 gap-y-3">
        {cell("today", stats.doneToday)}
        {cell("week", stats.doneWeek)}
        {cell("open", stats.open)}
        {cell("late", stats.overdue, true)}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- quick links -- */

export function QuickLinksWidget({ props, onProps, editing }: WidgetProps) {
  const links = Array.isArray(props.links)
    ? (props.links as { title: string; url: string }[])
    : [];
  const [draft, setDraft] = useState("");

  const add = () => {
    const url = draft.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    let title = normalized;
    try {
      title = new URL(normalized).hostname.replace(/^www\./, "");
    } catch {}
    onProps({ links: [...links, { title, url: normalized }] });
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Links</h2>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {links.map((l, i) => (
          <span key={`${l.url}-${i}`} className="group flex items-center gap-1.5">
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-[13px] text-ink-dim transition-colors hover:text-accent"
            >
              {l.title}
            </a>
            {editing && (
              <button
                aria-label={`Remove ${l.title}`}
                onClick={() => onProps({ links: links.filter((_, j) => j !== i) })}
                className="text-ink-faint hover:text-ink"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        aria-label="Add link"
        placeholder="Add"
        className="mt-1.5 h-8 rounded-lg border border-line bg-bg1 px-2 text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </div>
  );
}

/* -------------------------------------------------------- habit heatmap -- */

export function HabitHeatmapWidget() {
  const { data: routines = [] } = useRoutines();
  const { data: history = [] } = useRoutineHistory(35);
  const now = useNow();

  const grid = useMemo(() => {
    if (now === null) return Array.from({ length: 35 }, () => 0);
    const perDay = new Map<string, number>();
    for (const log of history) {
      const day = (log as { date?: string; created_at?: string }).date ??
        (log as { created_at?: string }).created_at?.slice(0, 10);
      if (day) perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const total = Math.max(1, routines.filter((r) => r.enabled).length);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(now - (34 - i) * 86_400_000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return Math.min(1, (perDay.get(key) ?? 0) / total);
    });
  }, [history, routines, now]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Consistency</h2>
      <div className="grid flex-1 grid-cols-7 content-center gap-1">
        {grid.map((v, i) => (
          <div
            key={i}
            className="aspect-square rounded-[3px]"
            style={{
              backgroundColor:
                v === 0 ? "var(--bg2, rgba(255,255,255,0.05))" : "var(--accent)",
              opacity: v === 0 ? 1 : 0.25 + v * 0.75,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- weather week -- */

export function WeatherWeekWidget() {
  const { data } = useWeather();
  if (!data) return <h2 className="eyebrow">Forecast</h2>;
  const days = data.daily.slice(0, 7);
  return (
    <div className="flex h-full flex-col">
      <h2 className="eyebrow mb-2">Forecast</h2>
      <div className="grid flex-1 grid-cols-7 content-center gap-1">
        {days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] uppercase text-ink-faint">
              {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
            <span className="tnum font-mono text-[12px] text-ink">{Math.round(d.max)}°</span>
            <span className="tnum font-mono text-[10.5px] text-ink-faint">{Math.round(d.min)}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}
