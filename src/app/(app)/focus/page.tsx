"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { todayISO, usePriorities, useTasks, useTaskActions, type Task } from "@/lib/data/tasks";
import { PlayerCard } from "@/components/spotify/PlayerCard";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconCheck, IconPause, IconPlay } from "@/components/ui/Icons";
import { useSettings } from "@/lib/settings/store";
import { useLofiRunning } from "@/components/soundboard/LofiPad";
import {
  getLofiLayer,
  setLofiLayer,
  startLofi,
  stopLofi,
  type LofiLayer,
} from "@/lib/sound/lofi";

type Phase = "idle" | "running" | "paused" | "done";

const LOFI_SLIDERS: { layer: LofiLayer; label: string }[] = [
  { layer: "chords", label: "Chords" },
  { layer: "crackle", label: "Crackle" },
  { layer: "rain", label: "Rain" },
];

function LofiControl() {
  const running = useLofiRunning();
  const [gains, setGains] = useState<Record<LofiLayer, number>>(() => ({
    chords: getLofiLayer("chords"),
    crackle: getLofiLayer("crackle"),
    rain: getLofiLayer("rain"),
  }));
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => (running ? stopLofi() : startLofi())}
        aria-pressed={running}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors ${
          running
            ? "border-(--accent)/60 bg-accent-soft text-accent"
            : "border-line bg-bg1/70 text-ink-dim hover:border-line-strong hover:text-ink"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full bg-current ${running ? "animate-pulse" : "opacity-50"}`}
          aria-hidden
        />
        Lofi
      </button>
      {running && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {LOFI_SLIDERS.map(({ layer, label }) => (
            <label key={layer} className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                {label}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={gains[layer]}
                aria-label={label}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setGains((g) => ({ ...g, [layer]: v }));
                  setLofiLayer(layer, v);
                }}
                className="h-1 w-16 cursor-pointer accent-(--accent)"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function useNotify() {
  return (title: string, body: string) => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(title, { body, silent: true });
      } catch {
        // notification constructor unavailable (some mobile browsers)
      }
    }
  };
}

export default function FocusPage() {
  const date = todayISO();
  const { data: priorities = [] } = usePriorities(date);
  const { data: backlog = [] } = useTasks({ backlog: true });
  const actions = useTaskActions();
  const { toast } = useToast();
  const notify = useNotify();
  const focusPlaylistUri = useSettings((s) => s.settings.focusPlaylistUri);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(25);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(25 * 60);
  const [note, setNote] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const endAt = useRef<number>(0);

  const candidates = useMemo(() => {
    const open = priorities.filter((t) => !t.completed_at);
    return open.length > 0 ? open : backlog.slice(0, 10);
  }, [priorities, backlog]);

  const task: Task | null =
    candidates.find((t) => t.id === taskId) ??
    backlog.find((t) => t.id === taskId) ??
    candidates[0] ??
    null;

  // timer loop
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setPhase("done");
        notify("Focus session complete", task ? task.title : "Nice work.");
      }
    }, 500);
    return () => clearInterval(id);
  }, [phase, task, notify]);

  const start = () => {
    endAt.current = Date.now() + remaining * 1000;
    setPhase("running");
  };
  const pause = () => setPhase("paused");
  const reset = (m: number) => {
    setMinutes(m);
    setRemaining(m * 60);
    setPhase("idle");
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progress = 1 - remaining / (minutes * 60);

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="rise w-full text-center">
        <p className="eyebrow mb-4">Focus</p>
        {task ? (
          <button
            onClick={() => setPickOpen(true)}
            className="display mx-auto block max-w-xl text-2xl leading-snug text-ink transition-colors hover:text-accent md:text-3xl"
          >
            {task.title}
          </button>
        ) : (
          <button
            onClick={() => setPickOpen(true)}
            className="text-lg text-ink-faint transition-colors hover:text-ink-dim"
          >
            Choose something to focus on
          </button>
        )}
      </div>

      <div className="rise relative flex flex-col items-center" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        {/* progress ring */}
        <svg width="280" height="280" viewBox="0 0 280 280" className="block" aria-hidden>
          <circle cx="140" cy="140" r="128" fill="none" stroke="var(--line)" strokeWidth="2" />
          <circle
            cx="140"
            cy="140"
            r="128"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 128}
            strokeDashoffset={2 * Math.PI * 128 * (1 - progress)}
            transform="rotate(-90 140 140)"
            style={{ transition: "stroke-dashoffset 0.5s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display tnum text-6xl font-light text-ink" aria-live="polite">
            {mm}:{ss}
          </span>
          {phase === "done" && <span className="mt-2 text-sm text-ok">Session complete</span>}
        </div>
      </div>

      <div className="rise flex items-center gap-3" style={{ "--stagger-i": 2 } as React.CSSProperties}>
        {phase === "idle" || phase === "paused" ? (
          <Button variant="media" size="lg" aria-label="Start timer" onClick={start}>
            <IconPlay size={20} />
          </Button>
        ) : phase === "running" ? (
          <Button variant="media" size="lg" aria-label="Pause timer" onClick={pause}>
            <IconPause size={20} />
          </Button>
        ) : null}
        {task && (
          <Button
            variant="primary"
            size="lg"
            onClick={async () => {
              await actions.complete(task);
              toast("Done. Well spent.", "success");
              setPhase("idle");
            }}
          >
            <IconCheck size={16} />
            Complete task
          </Button>
        )}
        <Link
          href="/today"
          className="flex h-12 items-center rounded-xl px-4 text-sm text-ink-faint transition-colors hover:text-ink"
        >
          End session
        </Link>
      </div>

      <div
        className="rise flex items-center gap-2"
        style={{ "--stagger-i": 3 } as React.CSSProperties}
        role="radiogroup"
        aria-label="Session length"
      >
        {[15, 25, 50, 90].map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={minutes === m}
            onClick={() => reset(m)}
            className={`tnum rounded-lg px-3 py-1.5 font-mono text-[13px] transition-colors ${
              minutes === m ? "bg-bg2 text-ink" : "text-ink-faint hover:text-ink-dim"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      <div className="rise w-full space-y-3" style={{ "--stagger-i": 4 } as React.CSSProperties}>
        <LofiControl />
        {focusPlaylistUri && (
          <div className="flex justify-center">
            <button
              onClick={async () => {
                const res = await fetch("/api/spotify/control", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: "playUri", uri: focusPlaylistUri }),
                });
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  toast(d.error ?? "Could not start the playlist", "error");
                }
              }}
              className="rounded-full border border-line bg-bg1/70 px-4 py-2 text-[13px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
            >
              Play focus playlist
            </button>
          </div>
        )}
        <PlayerCard />
        <div className="surface p-4">
          <TextArea
            label="Quick note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={async () => {
              if (task && note.trim() && note !== task.note) {
                await actions.setNote(task, note.trim());
                toast("Note saved");
              }
            }}
          />
        </div>
      </div>

      <Modal open={pickOpen} onClose={() => setPickOpen(false)} title="Focus on">
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {[...priorities.filter((t) => !t.completed_at), ...backlog.slice(0, 20)].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTaskId(t.id);
                setNote(t.note);
                setPickOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-ink-dim transition-colors hover:bg-bg1 hover:text-ink"
            >
              {t.title}
            </button>
          ))}
          {priorities.length === 0 && backlog.length === 0 && (
            <p className="py-4 text-sm text-ink-faint">
              Nothing in the backlog yet. Add tasks from Today first.
            </p>
          )}
        </div>
      </Modal>
    </main>
  );
}
