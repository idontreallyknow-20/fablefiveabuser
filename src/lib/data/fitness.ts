"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/types";

export type Exercise = Tables<"exercises">;
export type WorkoutSession = Tables<"workout_sessions">;
export type WorkoutEntry = Tables<"workout_entries">;
export type RecoveryNote = Tables<"recovery_notes">;

export type ExerciseCategory =
  | "push"
  | "pull"
  | "legs"
  | "core"
  | "skill"
  | "run"
  | "recovery";

export type Metric =
  | "reps"
  | "weight_kg"
  | "hold_seconds"
  | "distance_m"
  | "time_seconds";

export const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "weight_kg", label: "Weight (kg)" },
  { value: "hold_seconds", label: "Hold (seconds)" },
  { value: "distance_m", label: "Distance (m)" },
  { value: "time_seconds", label: "Time" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  skill: "Skill",
  run: "Run",
  recovery: "Recovery",
};

export const CATEGORY_ORDER: ExerciseCategory[] = [
  "push",
  "pull",
  "legs",
  "core",
  "skill",
  "run",
  "recovery",
];

async function userId() {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

/* ---------------------------------------------------------------------------
   Exercises
--------------------------------------------------------------------------- */

export function useExercises(includeArchived = false) {
  return useQuery({
    queryKey: ["exercises", { includeArchived }],
    queryFn: async (): Promise<Exercise[]> => {
      const supabase = supabaseBrowser();
      let q = supabase.from("exercises").select("*").order("name");
      if (!includeArchived) q = q.eq("archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      category: ExerciseCategory;
      metrics: Metric[];
    }): Promise<Exercise> => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { data, error } = await supabase
        .from("exercises")
        .insert({ ...input, user_id: uid, is_default: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useArchiveExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("exercises").update({ archived }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

/* ---------------------------------------------------------------------------
   Sessions
--------------------------------------------------------------------------- */

export function useWorkoutSessions(limit = 30) {
  return useQuery({
    queryKey: ["workout_sessions", limit],
    queryFn: async (): Promise<WorkoutSession[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ["workout_session", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<{ session: WorkoutSession; entries: WorkoutEntry[] }> => {
      const supabase = supabaseBrowser();
      const [s, e] = await Promise.all([
        supabase.from("workout_sessions").select("*").eq("id", id as string).single(),
        supabase
          .from("workout_entries")
          .select("*")
          .eq("session_id", id as string)
          .order("created_at", { ascending: true }),
      ]);
      if (s.error) throw s.error;
      if (e.error) throw e.error;
      return { session: s.data, entries: e.data ?? [] };
    },
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      split,
      date,
    }: {
      split: string;
      date: string;
    }): Promise<WorkoutSession> => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({ split, date, user_id: uid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["workout_sessions"] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"workout_sessions">;
    }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("workout_sessions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["workout_sessions"] });
      qc.invalidateQueries({ queryKey: ["workout_session"] });
    },
  });
}

/* ---------------------------------------------------------------------------
   Entries
--------------------------------------------------------------------------- */

/** every logged entry, newest first; feeds records and history counts */
export function useAllEntries() {
  return useQuery({
    queryKey: ["workout_entries", "all"],
    queryFn: async (): Promise<WorkoutEntry[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("workout_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function invalidateEntries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["workout_entries"] });
  qc.invalidateQueries({ queryKey: ["workout_session"] });
}

export interface EntryValues {
  reps: number | null;
  weight_kg: number | null;
  hold_seconds: number | null;
  distance_m: number | null;
  time_seconds: number | null;
}

/**
 * Insert a set. Personal-record status is computed client-side against every
 * prior entry for the same exercise before the insert, so `is_pr` lands true
 * on the row the moment it beats the previous best.
 */
export function useAddEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      exercise: Exercise;
      setNumber: number;
      values: EntryValues;
      rpe: number | null;
      formNote: string;
    }): Promise<WorkoutEntry> => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { data: prior, error: priorError } = await supabase
        .from("workout_entries")
        .select("*")
        .eq("exercise_id", input.exercise.id);
      if (priorError) throw priorError;
      const is_pr = isNewPR({ ...input.values, exercise_id: input.exercise.id }, prior ?? []);
      const row: TablesInsert<"workout_entries"> = {
        session_id: input.sessionId,
        exercise_id: input.exercise.id,
        exercise_name: input.exercise.name,
        set_number: input.setNumber,
        reps: input.values.reps,
        weight_kg: input.values.weight_kg,
        hold_seconds: input.values.hold_seconds,
        distance_m: input.values.distance_m,
        time_seconds: input.values.time_seconds,
        rpe: input.rpe,
        form_note: input.formNote,
        is_pr,
        user_id: uid,
      };
      const { data, error } = await supabase
        .from("workout_entries")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => invalidateEntries(qc),
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"workout_entries">;
    }) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("workout_entries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => invalidateEntries(qc),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("workout_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => invalidateEntries(qc),
  });
}

/* ---------------------------------------------------------------------------
   Recovery notes
--------------------------------------------------------------------------- */

export function useRecoveryNotes(limit = 20) {
  return useQuery({
    queryKey: ["recovery_notes", limit],
    queryFn: async (): Promise<RecoveryNote[]> => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("recovery_notes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateRecoveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"recovery_notes">, "user_id">) => {
      const supabase = supabaseBrowser();
      const uid = await userId();
      const { error } = await supabase
        .from("recovery_notes")
        .insert({ ...input, user_id: uid });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["recovery_notes"] }),
  });
}

export function useDeleteRecoveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("recovery_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["recovery_notes"] }),
  });
}

/* ---------------------------------------------------------------------------
   Personal records. computePRs and isNewPR are pure so they can be
   unit-tested without Supabase or React.
--------------------------------------------------------------------------- */

/** the minimal entry shape the PR math needs */
export type PREntry = {
  /** optional: isNewPR compares within one exercise and does not need it */
  exercise_id?: string | null;
  reps: number | null;
  weight_kg: number | null;
  hold_seconds: number | null;
  distance_m: number | null;
  time_seconds: number | null;
};

export type PRExercise = { id: string; name: string; metrics: string[] };

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  metrics: string[];
  /** heaviest load lifted, at whatever rep count it happened */
  maxWeight: { weightKg: number; reps: number | null } | null;
  /** most reps in a single unweighted set */
  maxReps: number | null;
  /** longest hold */
  maxHold: number | null;
  /** farthest single effort */
  bestDistance: number | null;
  /** fastest pace across efforts that logged both distance and time */
  bestPace: { secondsPerKm: number; distanceM: number; timeSeconds: number } | null;
}

const isUnweighted = (e: PREntry) => e.weight_kg == null || e.weight_kg === 0;

function paceOf(e: PREntry): number | null {
  if (e.distance_m == null || e.time_seconds == null) return null;
  if (e.distance_m <= 0 || e.time_seconds <= 0) return null;
  return (e.time_seconds / e.distance_m) * 1000;
}

/** per-exercise bests over a set of entries; pure and order-independent */
export function computePRs(entries: PREntry[], exercises: PRExercise[]): ExercisePR[] {
  const byExercise = new Map<string, PREntry[]>();
  for (const e of entries) {
    if (!e.exercise_id) continue;
    const list = byExercise.get(e.exercise_id);
    if (list) list.push(e);
    else byExercise.set(e.exercise_id, [e]);
  }

  return exercises.map((ex) => {
    const list = byExercise.get(ex.id) ?? [];
    const pr: ExercisePR = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      metrics: ex.metrics,
      maxWeight: null,
      maxReps: null,
      maxHold: null,
      bestDistance: null,
      bestPace: null,
    };
    for (const e of list) {
      if (e.weight_kg != null && e.weight_kg > 0) {
        if (!pr.maxWeight || e.weight_kg > pr.maxWeight.weightKg) {
          pr.maxWeight = { weightKg: e.weight_kg, reps: e.reps };
        }
      }
      if (e.reps != null && e.reps > 0 && isUnweighted(e)) {
        if (pr.maxReps == null || e.reps > pr.maxReps) pr.maxReps = e.reps;
      }
      if (e.hold_seconds != null && e.hold_seconds > 0) {
        if (pr.maxHold == null || e.hold_seconds > pr.maxHold) pr.maxHold = e.hold_seconds;
      }
      if (e.distance_m != null && e.distance_m > 0) {
        if (pr.bestDistance == null || e.distance_m > pr.bestDistance) {
          pr.bestDistance = e.distance_m;
        }
      }
      const pace = paceOf(e);
      if (pace != null && (!pr.bestPace || pace < pr.bestPace.secondsPerKm)) {
        pr.bestPace = {
          secondsPerKm: pace,
          distanceM: e.distance_m as number,
          timeSeconds: e.time_seconds as number,
        };
      }
    }
    return pr;
  });
}

/**
 * True when a candidate set strictly beats a previous best on any dimension.
 * A first-ever entry is not a PR; there is nothing to beat yet.
 */
export function isNewPR(candidate: PREntry, prior: PREntry[]): boolean {
  // heaviest load at any reps
  if (candidate.weight_kg != null && candidate.weight_kg > 0) {
    let best: number | null = null;
    for (const p of prior) {
      if (p.weight_kg != null && p.weight_kg > 0 && (best == null || p.weight_kg > best)) {
        best = p.weight_kg;
      }
    }
    if (best != null && candidate.weight_kg > best) return true;
  }
  // most unweighted reps
  if (candidate.reps != null && candidate.reps > 0 && isUnweighted(candidate)) {
    let best: number | null = null;
    for (const p of prior) {
      if (p.reps != null && p.reps > 0 && isUnweighted(p) && (best == null || p.reps > best)) {
        best = p.reps;
      }
    }
    if (best != null && candidate.reps > best) return true;
  }
  // longest hold
  if (candidate.hold_seconds != null && candidate.hold_seconds > 0) {
    let best: number | null = null;
    for (const p of prior) {
      if (p.hold_seconds != null && p.hold_seconds > 0 && (best == null || p.hold_seconds > best)) {
        best = p.hold_seconds;
      }
    }
    if (best != null && candidate.hold_seconds > best) return true;
  }
  // farthest distance
  if (candidate.distance_m != null && candidate.distance_m > 0) {
    let best: number | null = null;
    for (const p of prior) {
      if (p.distance_m != null && p.distance_m > 0 && (best == null || p.distance_m > best)) {
        best = p.distance_m;
      }
    }
    if (best != null && candidate.distance_m > best) return true;
  }
  // fastest pace
  const candidatePace = paceOf(candidate);
  if (candidatePace != null) {
    let best: number | null = null;
    for (const p of prior) {
      const pace = paceOf(p);
      if (pace != null && (best == null || pace < best)) best = pace;
    }
    if (best != null && candidatePace < best) return true;
  }
  return false;
}

/** live personal records: all entries + all exercises, folded through computePRs */
export function usePersonalRecords() {
  const exercises = useExercises();
  const entries = useAllEntries();
  const records = useMemo(
    () => computePRs(entries.data ?? [], exercises.data ?? []),
    [entries.data, exercises.data],
  );
  return {
    records,
    hasEntries: (entries.data?.length ?? 0) > 0,
    isLoading: exercises.isLoading || entries.isLoading,
  };
}

/* ---------------------------------------------------------------------------
   Formatting helpers (shared by Train components)
--------------------------------------------------------------------------- */

export function fmtSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtPace(secondsPerKm: number): string {
  const s = Math.round(secondsPerKm);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")} /km`;
}

export function fmtDistance(meters: number): string {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(2).replace(/\.?0+$/, "");
    return `${km} km`;
  }
  return `${meters} m`;
}

export function fmtWeight(kg: number): string {
  return Number.isInteger(kg) ? `${kg} kg` : `${kg.toFixed(1)} kg`;
}

/** compact one-line summary of a set, driven by whatever values it has */
export function entrySummary(e: {
  reps: number | null;
  weight_kg: number | null;
  hold_seconds: number | null;
  distance_m: number | null;
  time_seconds: number | null;
}): string {
  const parts: string[] = [];
  if (e.weight_kg != null && e.weight_kg > 0) {
    parts.push(e.reps != null ? `${fmtWeight(e.weight_kg)} x ${e.reps}` : fmtWeight(e.weight_kg));
  } else if (e.reps != null) {
    parts.push(`${e.reps} reps`);
  }
  if (e.hold_seconds != null) parts.push(`${fmtSeconds(e.hold_seconds)} hold`);
  if (e.distance_m != null) parts.push(fmtDistance(e.distance_m));
  if (e.time_seconds != null) parts.push(fmtSeconds(e.time_seconds));
  return parts.join(" · ");
}
