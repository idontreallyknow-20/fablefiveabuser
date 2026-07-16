"use client";

import { useEffect, useRef, useState } from "react";
import {
  useSaveJournal,
  useSelfcareLogs,
  useSetSelfcareValue,
  useToggleSelfcare,
  type DoneKind,
  type ValueKind,
} from "@/lib/data/selfcare";
import { todayISO } from "@/lib/data/tasks";
import { ActionButton } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { IconCheck } from "@/components/ui/Icons";

const CHIPS: { kind: DoneKind; label: string }[] = [
  { kind: "skincare_am", label: "Morning skincare" },
  { kind: "skincare_pm", label: "Evening skincare" },
  { kind: "mobility", label: "Mobility" },
  { kind: "outdoor", label: "Outdoor time" },
];

const STEPPERS: {
  kind: ValueKind;
  label: string;
  unit: string;
  step: number;
  max: number;
}[] = [
  { kind: "sleep", label: "Sleep", unit: "h", step: 0.5, max: 16 },
  { kind: "water", label: "Water", unit: "glasses", step: 1, max: 24 },
  { kind: "protein", label: "Protein", unit: "g", step: 5, max: 400 },
  { kind: "calories", label: "Calories", unit: "kcal", step: 50, max: 8000 },
];

export function SelfcareToday() {
  const date = todayISO();
  const { data: logs = [], isLoading } = useSelfcareLogs(date);
  const toggle = useToggleSelfcare();
  const setValue = useSetSelfcareValue();

  const doneSet = new Set(logs.filter((l) => l.done).map((l) => l.kind));
  const valueOf = (kind: string): number | null =>
    logs.find((l) => l.kind === kind)?.value ?? null;

  // local stepper values so quick taps feel immediate; persisted debounced
  const [localVals, setLocalVals] = useState<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const stepperValue = (kind: ValueKind): number => localVals[kind] ?? valueOf(kind) ?? 0;

  const step = (kind: ValueKind, delta: number, max: number) => {
    const next = Math.min(max, Math.max(0, Math.round((stepperValue(kind) + delta) * 10) / 10));
    setLocalVals((v) => ({ ...v, [kind]: next }));
    if (timers.current[kind]) clearTimeout(timers.current[kind]);
    timers.current[kind] = setTimeout(() => {
      setValue.mutate({ date, kind, value: next });
    }, 700);
  };

  return (
    <section className="surface p-5" aria-label="Self-care today">
      <p className="eyebrow mb-3">Self-care today</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Done today">
        {CHIPS.map((c) => {
          const done = doneSet.has(c.kind);
          return (
            <button
              key={c.kind}
              type="button"
              aria-pressed={done}
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ date, kind: c.kind })}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium",
                "transition-colors duration-[var(--dur-base)] disabled:opacity-45",
                done
                  ? "border-(--accent)/35 bg-accent-soft text-accent"
                  : "border-line bg-bg1 text-ink-dim hover:border-line-strong hover:text-ink",
              ].join(" ")}
            >
              {done && <IconCheck size={13} />}
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        {STEPPERS.map((s) => {
          const value = stepperValue(s.kind);
          return (
            <div key={s.kind} className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim" id={`stepper-${s.kind}`}>
                {s.label}
              </span>
              <div className="flex h-10 items-center justify-between rounded-xl border border-line bg-bg1 px-1.5">
                <button
                  type="button"
                  aria-label={`Decrease ${s.label.toLowerCase()}`}
                  onClick={() => step(s.kind, -s.step, s.max)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                    <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <span
                  className="tnum text-sm text-ink"
                  aria-labelledby={`stepper-${s.kind}`}
                  aria-live="polite"
                >
                  {value}
                  <span className="ml-1 text-[11px] text-ink-faint">{s.unit}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${s.label.toLowerCase()}`}
                  onClick={() => step(s.kind, s.step, s.max)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-bg2 hover:text-ink"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                    <path
                      d="M6 2v8M2 6h8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        {isLoading ? (
          <p className="text-sm text-ink-faint">Loading</p>
        ) : (
          <JournalEditor
            key={date}
            date={date}
            initial={logs.find((l) => l.kind === "journal")?.note ?? ""}
          />
        )}
      </div>
    </section>
  );
}

function JournalEditor({ date, initial }: { date: string; initial: string }) {
  const saveJournal = useSaveJournal();
  const [journal, setJournal] = useState(initial);
  return (
    <>
      <TextArea
        label="Journal"
        rows={4}
        value={journal}
        onChange={(e) => setJournal(e.target.value)}
        placeholder="A few lines is plenty"
      />
      <div className="mt-2 flex justify-end">
        <ActionButton
          variant="quiet"
          size="sm"
          onAction={async () => {
            await saveJournal.mutateAsync({ date, note: journal });
          }}
        >
          Save journal
        </ActionButton>
      </div>
    </>
  );
}
