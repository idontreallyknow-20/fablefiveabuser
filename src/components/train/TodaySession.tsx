"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  METRIC_OPTIONS,
  entrySummary,
  fmtSeconds,
  useAddEntry,
  useCreateExercise,
  useCreateSession,
  useDeleteEntry,
  useExercises,
  useSession,
  useUpdateEntry,
  useUpdateSession,
  useWorkoutSessions,
  type Exercise,
  type ExerciseCategory,
  type Metric,
  type WorkoutEntry,
  type WorkoutSession,
} from "@/lib/data/fitness";
import { todayISO } from "@/lib/data/tasks";
import { ActionButton, Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { LabeledSelect } from "@/components/train/Select";
import { IconEdit, IconPlus, IconTrash } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";

const SPLITS: { value: string; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "skills", label: "Skills" },
  { value: "run", label: "Run" },
  { value: "recovery", label: "Recovery" },
];

export function splitLabel(split: string): string {
  const known = SPLITS.find((s) => s.value === split);
  if (known) return known.label;
  return split.length > 0 ? split.charAt(0).toUpperCase() + split.slice(1) : "Session";
}

function parseNumber(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** accepts "mm:ss", "h:mm:ss" or plain seconds */
function parseTime(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (t.includes(":")) {
    const parts = t.split(":").map((p) => Number(p));
    if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

const METRIC_FIELD: Record<Metric, { label: string; placeholder: string; time?: boolean }> = {
  reps: { label: "Reps", placeholder: "8" },
  weight_kg: { label: "Weight (kg)", placeholder: "60" },
  hold_seconds: { label: "Hold (seconds)", placeholder: "30" },
  distance_m: { label: "Distance (m)", placeholder: "5000" },
  time_seconds: { label: "Time (min:sec)", placeholder: "25:00", time: true },
};

type MetricStrings = Partial<Record<Metric, string>>;

function parseValues(metrics: string[], raw: MetricStrings) {
  return {
    reps:
      metrics.includes("reps") && raw.reps != null
        ? (() => {
            const n = parseNumber(raw.reps);
            return n == null ? null : Math.round(n);
          })()
        : null,
    weight_kg: metrics.includes("weight_kg") && raw.weight_kg != null ? parseNumber(raw.weight_kg) : null,
    hold_seconds:
      metrics.includes("hold_seconds") && raw.hold_seconds != null ? parseNumber(raw.hold_seconds) : null,
    distance_m:
      metrics.includes("distance_m") && raw.distance_m != null ? parseNumber(raw.distance_m) : null,
    time_seconds:
      metrics.includes("time_seconds") && raw.time_seconds != null ? parseTime(raw.time_seconds) : null,
  };
}

/* ---------------------------------------------------------------------------
   Section root: split picker until a session exists for today, then the
   active session with its entry composer.
--------------------------------------------------------------------------- */

export function TodaySession() {
  const date = todayISO();
  const { data: sessions, isLoading } = useWorkoutSessions(60);
  const todaySession = (sessions ?? []).find((s) => s.date === date) ?? null;

  if (isLoading) {
    return (
      <section className="surface p-5" aria-label="Today's session">
        <p className="eyebrow mb-2">Today&apos;s session</p>
        <p className="text-sm text-ink-faint">Loading</p>
      </section>
    );
  }

  return todaySession ? <ActiveSession session={todaySession} /> : <SplitPicker date={date} />;
}

function SplitPicker({ date }: { date: string }) {
  const create = useCreateSession();
  const [custom, setCustom] = useState("");

  return (
    <section className="surface p-5" aria-label="Today's session">
      <p className="eyebrow mb-2">Today&apos;s session</p>
      <p className="mb-4 text-sm text-ink-dim">What kind of work today?</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {SPLITS.map((s) => (
          <Button
            key={s.value}
            size="sm"
            disabled={create.isPending}
            onClick={() => create.mutate({ split: s.value, date })}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const split = custom.trim();
          if (split) create.mutate({ split, date });
        }}
      >
        <div className="flex-1">
          <Field
            label="Or something of your own"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            
          />
        </div>
        <Button type="submit" size="md" disabled={!custom.trim() || create.isPending}>
          Start
        </Button>
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Active session
--------------------------------------------------------------------------- */

function ActiveSession({ session }: { session: WorkoutSession }) {
  const { data: detail } = useSession(session.id);
  const entries = useMemo(() => detail?.entries ?? [], [detail]);
  const update = useUpdateSession();
  const finished = session.duration_min != null;

  const startedAt = new Date(session.created_at);
  const startedLabel = `${String(startedAt.getHours()).padStart(2, "0")}:${String(
    startedAt.getMinutes(),
  ).padStart(2, "0")}`;

  return (
    <section className="surface p-5" aria-label="Today's session">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow mb-1.5">Today&apos;s session</p>
          <h2 className="display text-xl text-ink">{splitLabel(session.split)}</h2>
          <p className="tnum mt-0.5 text-[12px] text-ink-faint">
            started {startedLabel}
            {finished ? ` · finished · ${session.duration_min} min` : ""}
          </p>
        </div>
        {finished ? (
          <Button
            variant="quiet"
            size="sm"
            onClick={() => update.mutate({ id: session.id, patch: { duration_min: null } })}
          >
            Reopen
          </Button>
        ) : (
          <ActionButton
            variant="primary"
            size="sm"
            onAction={async () => {
              const minutes = Math.max(
                1,
                Math.round((Date.now() - new Date(session.created_at).getTime()) / 60000),
              );
              await update.mutateAsync({ id: session.id, patch: { duration_min: minutes } });
            }}
          >
            Finish session
          </ActionButton>
        )}
      </div>

      {!finished && <EntryComposer sessionId={session.id} entries={entries} />}

      {entries.length > 0 ? (
        <ul className="mt-4">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} readOnly={finished} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">
          Nothing logged yet. Warm up well; the first set can wait for you.
        </p>
      )}

      <div className="mt-5">
        <SessionNotes key={session.id} session={session} />
      </div>
    </section>
  );
}

function SessionNotes({ session }: { session: WorkoutSession }) {
  const update = useUpdateSession();
  const [notes, setNotes] = useState(session.notes);
  return (
    <TextArea
      label="Session notes"
      rows={2}
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      onBlur={() => {
        if (notes !== session.notes) update.mutate({ id: session.id, patch: { notes } });
      }}
      
    />
  );
}

/* ---------------------------------------------------------------------------
   Entry composer
--------------------------------------------------------------------------- */

function EntryComposer({ sessionId, entries }: { sessionId: string; entries: WorkoutEntry[] }) {
  const { data: exercises = [] } = useExercises();
  const addEntry = useAddEntry();
  const { toast } = useToast();

  const [exerciseId, setExerciseId] = useState("");
  const [raw, setRaw] = useState<MetricStrings>({});
  const [rpe, setRpe] = useState("");
  const [formNote, setFormNote] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const exercise = exercises.find((e) => e.id === exerciseId) ?? null;

  const grouped = useMemo(() => {
    const cats = [...CATEGORY_ORDER] as string[];
    for (const e of exercises) if (!cats.includes(e.category)) cats.push(e.category);
    return cats
      .map((c) => ({
        category: c,
        items: exercises.filter((e) => e.category === c),
      }))
      .filter((g) => g.items.length > 0);
  }, [exercises]);

  const values = exercise ? parseValues(exercise.metrics, raw) : null;
  const hasValue =
    values != null &&
    (values.reps != null ||
      values.weight_kg != null ||
      values.hold_seconds != null ||
      values.distance_m != null ||
      values.time_seconds != null);

  const add = async () => {
    if (!exercise || !values || !hasValue) return;
    const parsedRpe = parseNumber(rpe);
    const setNumber = entries.filter((e) => e.exercise_id === exercise.id).length + 1;
    const inserted = await addEntry.mutateAsync({
      sessionId,
      exercise,
      setNumber,
      values,
      rpe: parsedRpe == null ? null : Math.min(10, Math.max(1, Math.round(parsedRpe))),
      formNote: formNote.trim(),
    });
    setFormNote("");
    if (inserted.is_pr) toast("That is a new personal record", "success");
  };

  return (
    <div className="rounded-xl border border-line bg-bg0/40 p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <LabeledSelect
            label="Exercise"
            value={exerciseId}
            onChange={(e) => {
              setExerciseId(e.target.value);
              setRaw({});
            }}
          >
            <option value="">Choose an exercise</option>
            {grouped.map((g) => (
              <optgroup key={g.category} label={CATEGORY_LABELS[g.category] ?? g.category}>
                {g.items.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </LabeledSelect>
        </div>
        <Button variant="quiet" size="md" onClick={() => setNewOpen(true)}>
          <IconPlus size={14} />
          New exercise
        </Button>
      </div>

      {exercise && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(exercise.metrics as Metric[])
              .filter((m): m is Metric => m in METRIC_FIELD)
              .map((m) => (
                <Field
                  key={m}
                  label={METRIC_FIELD[m].label}
                  inputMode={METRIC_FIELD[m].time ? "text" : "decimal"}
                  value={raw[m] ?? ""}
                  onChange={(e) => setRaw((r) => ({ ...r, [m]: e.target.value }))}
                  placeholder={METRIC_FIELD[m].placeholder}
                />
              ))}
            <Field
              label="RPE (1 to 10, optional)"
              inputMode="numeric"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              
            />
          </div>
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <Field
                label="Form note (optional)"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                
              />
            </div>
            <ActionButton variant="primary" size="md" disabled={!hasValue} onAction={add}>
              Add set
            </ActionButton>
          </div>
        </>
      )}

      <NewExerciseModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(e) => {
          setExerciseId(e.id);
          setRaw({});
        }}
      />
    </div>
  );
}

function NewExerciseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (e: Exercise) => void;
}) {
  const create = useCreateExercise();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("push");
  const [metrics, setMetrics] = useState<Metric[]>(["reps"]);

  const toggleMetric = (m: Metric) =>
    setMetrics((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  return (
    <Modal open={open} onClose={onClose} title="New exercise">
      <div className="flex flex-col gap-4">
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          
        />
        <LabeledSelect
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </LabeledSelect>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-dim">What it measures</legend>
          <div className="grid grid-cols-2 gap-2">
            {METRIC_OPTIONS.map((m) => (
              <label key={m.value} className="flex items-center gap-2 text-sm text-ink-dim">
                <input
                  type="checkbox"
                  checked={metrics.includes(m.value)}
                  onChange={() => toggleMetric(m.value)}
                  className="h-4 w-4 rounded border-line bg-bg1"
                  style={{ accentColor: "var(--accent)" }}
                />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <ActionButton
            variant="primary"
            disabled={!name.trim() || metrics.length === 0}
            onAction={async () => {
              const created = await create.mutateAsync({
                name: name.trim(),
                category,
                metrics,
              });
              onCreated(created);
              setName("");
              setMetrics(["reps"]);
              onClose();
            }}
          >
            Create
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------------------
   Entry rows
--------------------------------------------------------------------------- */

export function EntryRow({ entry, readOnly = false }: { entry: WorkoutEntry; readOnly?: boolean }) {
  const del = useDeleteEntry();
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex items-start justify-between gap-3 border-t border-line py-2.5 first:border-t-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm text-ink">{entry.exercise_name}</span>
          <span className="tnum text-[12px] text-ink-faint">set {entry.set_number}</span>
          {entry.is_pr && (
            <span className="rounded-md bg-accent-soft px-1.5 py-px font-mono text-[10px] tracking-[0.08em] text-accent">
              PR
            </span>
          )}
        </div>
        <p className="tnum text-[13px] text-ink-dim">
          {entrySummary(entry)}
          {entry.rpe != null ? ` · RPE ${entry.rpe}` : ""}
        </p>
        {entry.form_note && <p className="text-[12px] text-ink-faint">{entry.form_note}</p>}
      </div>
      {!readOnly && (
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="icon"
            size="sm"
            aria-label={`Edit ${entry.exercise_name} set ${entry.set_number}`}
            onClick={() => setEditing(true)}
          >
            <IconEdit size={14} />
          </Button>
          <Button
            variant="icon"
            size="sm"
            aria-label={`Delete ${entry.exercise_name} set ${entry.set_number}`}
            onClick={() => del.mutate(entry.id)}
          >
            <IconTrash size={14} />
          </Button>
        </div>
      )}
      {editing && <EditEntryModal entry={entry} onClose={() => setEditing(false)} />}
    </li>
  );
}

function EditEntryModal({ entry, onClose }: { entry: WorkoutEntry; onClose: () => void }) {
  const { data: exercises = [] } = useExercises(true);
  const update = useUpdateEntry();

  const exercise = exercises.find((e) => e.id === entry.exercise_id) ?? null;
  const metrics: Metric[] = useMemo(() => {
    if (exercise) return exercise.metrics.filter((m): m is Metric => m in METRIC_FIELD);
    const fromValues: Metric[] = [];
    if (entry.reps != null) fromValues.push("reps");
    if (entry.weight_kg != null) fromValues.push("weight_kg");
    if (entry.hold_seconds != null) fromValues.push("hold_seconds");
    if (entry.distance_m != null) fromValues.push("distance_m");
    if (entry.time_seconds != null) fromValues.push("time_seconds");
    return fromValues.length > 0 ? fromValues : ["reps"];
  }, [exercise, entry]);

  const [raw, setRaw] = useState<MetricStrings>(() => ({
    reps: entry.reps != null ? String(entry.reps) : "",
    weight_kg: entry.weight_kg != null ? String(entry.weight_kg) : "",
    hold_seconds: entry.hold_seconds != null ? String(entry.hold_seconds) : "",
    distance_m: entry.distance_m != null ? String(entry.distance_m) : "",
    time_seconds: entry.time_seconds != null ? fmtSeconds(entry.time_seconds) : "",
  }));
  const [rpe, setRpe] = useState(entry.rpe != null ? String(entry.rpe) : "");
  const [formNote, setFormNote] = useState(entry.form_note);

  const values = parseValues(metrics, raw);
  const hasValue =
    values.reps != null ||
    values.weight_kg != null ||
    values.hold_seconds != null ||
    values.distance_m != null ||
    values.time_seconds != null;

  return (
    <Modal open onClose={onClose} title={`${entry.exercise_name} · set ${entry.set_number}`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <Field
              key={m}
              label={METRIC_FIELD[m].label}
              inputMode={METRIC_FIELD[m].time ? "text" : "decimal"}
              value={raw[m] ?? ""}
              onChange={(e) => setRaw((r) => ({ ...r, [m]: e.target.value }))}
            />
          ))}
          <Field
            label="RPE (1 to 10, optional)"
            inputMode="numeric"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
          />
        </div>
        <Field
          label="Form note (optional)"
          value={formNote}
          onChange={(e) => setFormNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <ActionButton
            variant="primary"
            disabled={!hasValue}
            onAction={async () => {
              const parsedRpe = parseNumber(rpe);
              await update.mutateAsync({
                id: entry.id,
                patch: {
                  ...values,
                  rpe: parsedRpe == null ? null : Math.min(10, Math.max(1, Math.round(parsedRpe))),
                  form_note: formNote.trim(),
                },
              });
              onClose();
            }}
          >
            Save
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}
