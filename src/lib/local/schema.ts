// Column defaults, constraints, and relations for the on-device tables.
// Mirrors supabase/migrations so data exported from the old hosted
// version imports cleanly.

type Defaults = () => Record<string, unknown>;

const now = () => new Date().toISOString();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const stamps = () => ({ created_at: now(), updated_at: now() });
const created = () => ({ created_at: now() });

export const TABLES: Record<string, { owned: boolean; defaults: Defaults; touch: boolean }> = {
  profiles: {
    owned: false,
    touch: true,
    defaults: () => ({
      display_name: "",
      app_name: "Orbit",
      settings: {},
      onboarded_at: null,
      ...stamps(),
    }),
  },
  projects: {
    owned: true,
    touch: true,
    defaults: () => ({
      kind: "general",
      description: "",
      statuses: [],
      priority: 2,
      archived: false,
      milestones: [],
      custom_fields: [],
      sort_order: 0,
      color: null,
      icon: null,
      ...stamps(),
    }),
  },
  tasks: {
    owned: true,
    touch: true,
    defaults: () => ({
      project_id: null,
      note: "",
      status: "todo",
      importance: 2,
      due_date: null,
      scheduled_at: null,
      scheduled_end_at: null,
      duration_min: null,
      energy: null,
      priority_slot: null,
      priority_date: null,
      deferral_count: 0,
      completed_at: null,
      links: [],
      depends_on: [],
      custom: {},
      sort_order: 0,
      tags: [],
      recurrence: null,
      checklist: [],
      team_id: null,
      ...stamps(),
    }),
  },
  nerf_content: {
    owned: true,
    touch: true,
    defaults: () => ({
      stage: "idea",
      platforms: [],
      format: "",
      hook: "",
      concept: "",
      caption: "",
      cta: "",
      link: "",
      publish_date: null,
      metrics: {},
      notes: "",
      repurpose_status: "",
      next_action: "",
      sort_order: 0,
      ...stamps(),
    }),
  },
  exercises: {
    owned: true,
    touch: false,
    defaults: () => ({ category: "push", metrics: ["reps"], is_default: false, archived: false, ...created() }),
  },
  workout_sessions: {
    owned: true,
    touch: true,
    defaults: () => ({ date: today(), split: "", notes: "", duration_min: null, ...stamps() }),
  },
  workout_entries: {
    owned: true,
    touch: false,
    defaults: () => ({
      exercise_id: null,
      exercise_name: "",
      set_number: 1,
      reps: null,
      weight_kg: null,
      hold_seconds: null,
      distance_m: null,
      time_seconds: null,
      rpe: null,
      form_note: "",
      is_pr: false,
      ...created(),
    }),
  },
  recovery_notes: {
    owned: true,
    touch: false,
    defaults: () => ({ date: today(), kind: "recovery", body_area: "", severity: null, note: "", ...created() }),
  },
  selfcare_logs: {
    owned: true,
    touch: false,
    defaults: () => ({ date: today(), value: null, note: "", done: true, ...created() }),
  },
  checkins: {
    owned: true,
    touch: true,
    defaults: () => ({
      date: today(),
      mood: null,
      energy: null,
      stress: null,
      sleep_quality: null,
      note: "",
      what_helped: "",
      what_was_hard: "",
      ...stamps(),
    }),
  },
  relationship_items: {
    owned: true,
    touch: true,
    defaults: () => ({ kind: "note", note: "", date: null, done: false, ...stamps() }),
  },
  routines: {
    owned: true,
    touch: true,
    defaults: () => ({
      slug: null,
      category: "reset",
      schedule: { times: [], days: [0, 1, 2, 3, 4, 5, 6] },
      enabled: true,
      sort_order: 0,
      ...stamps(),
    }),
  },
  routine_logs: {
    owned: true,
    touch: false,
    defaults: () => ({ date: today(), status: "done", at: now() }),
  },
  displays: {
    owned: true,
    touch: true,
    defaults: () => ({
      name: "Display",
      role: "command",
      theme: null,
      variant: null,
      motion: "balanced",
      brightness: 1,
      density: "comfortable",
      ambient: {},
      layout: {},
      last_seen_at: null,
      ...stamps(),
    }),
  },
  notification_prefs: {
    owned: true,
    touch: true,
    defaults: () => ({ enabled: true, updated_at: now() }),
  },
  notification_log: {
    owned: true,
    touch: false,
    defaults: () => ({ body: "", sent_at: now() }),
  },
  soundboard_pads: {
    owned: true,
    touch: true,
    defaults: () => ({
      slot: 0,
      label: "",
      color: "",
      hotkey: "",
      kind: "synth",
      params: {},
      sample_path: null,
      loop: false,
      gain: 0.8,
      ...stamps(),
    }),
  },
  user_backgrounds: {
    owned: true,
    touch: false,
    defaults: () => ({
      avg_color: "#0a0a0b",
      width: null,
      height: null,
      duration_s: null,
      size_bytes: null,
      overlay: {},
      ...created(),
    }),
  },
  meals: {
    owned: true,
    touch: false,
    defaults: () => ({
      date: today(),
      name: "",
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      note: "",
      ...created(),
    }),
  },
};

/** unique constraints; a row is skipped when any key column is null */
export const UNIQUE: Record<string, { cols: string[]; where?: (r: Record<string, unknown>) => boolean }[]> = {
  checkins: [{ cols: ["date"] }],
  notification_prefs: [{ cols: ["category"] }],
  tasks: [
    {
      cols: ["priority_date", "priority_slot"],
      where: (r) => r.priority_slot != null && r.completed_at == null,
    },
  ],
};

/** foreign keys that react when their parent row is deleted */
export const ON_DELETE: Record<string, { table: string; col: string; action: "cascade" | "set null" }[]> = {
  projects: [{ table: "tasks", col: "project_id", action: "set null" }],
  workout_sessions: [{ table: "workout_entries", col: "session_id", action: "cascade" }],
  exercises: [{ table: "workout_entries", col: "exercise_id", action: "set null" }],
  routines: [{ table: "routine_logs", col: "routine_id", action: "cascade" }],
};

/** one-to-many embeds used in select strings, e.g. "*, workout_entries(*)" */
export const EMBEDS: Record<string, Record<string, string>> = {
  workout_sessions: { workout_entries: "session_id" },
};

/** what a fresh device starts with, same as the old signup trigger */
export function seedRows(): Record<string, Record<string, unknown>[]> {
  const everyDay = [0, 1, 2, 3, 4, 5, 6];
  const routine = (slug: string, name: string, category: string, times: string[], sort: number, days = everyDay) => ({
    slug,
    name,
    category,
    schedule: { times, days },
    sort_order: sort,
  });
  return {
    exercises: [
      ["Handstand push-up", "skill", ["reps"]],
      ["Muscle-up", "skill", ["reps"]],
      ["Handstand balance", "skill", ["hold_seconds"]],
      ["Pull-up", "pull", ["reps", "weight_kg"]],
      ["Push-up", "push", ["reps"]],
      ["Bench press", "push", ["reps", "weight_kg"]],
      ["Vertical jump", "legs", ["distance_m"]],
      ["Run", "run", ["distance_m", "time_seconds"]],
    ].map(([name, category, metrics]) => ({ name, category, metrics, is_default: true })),
    routines: [
      routine("room_reset", "Five-minute room reset", "reset", ["21:00"], 1),
      routine("clear_desk", "Clear desk", "reset", ["18:00"], 2),
      routine("clothes_away", "Put clothes away", "reset", ["21:15"], 3),
      routine("dishes_out", "Remove dishes", "reset", ["20:45"], 4),
      routine("refill_water", "Refill water", "reset", ["09:00", "15:00"], 5),
      routine("skincare_am", "Morning skincare", "skincare", ["08:30"], 6),
      routine("skincare_pm", "Evening skincare", "skincare", ["22:30"], 7),
      routine("prep_tomorrow", "Prepare for tomorrow", "prep", ["21:30"], 8),
      routine("mobility", "Mobility", "movement", ["17:30"], 9, [1, 3, 5]),
      routine("nightly_reflection", "Nightly reflection", "reflect", ["22:00"], 10),
    ],
    notification_prefs: [
      "tasks",
      "calendar",
      "focus",
      "nerfchess",
      "workouts",
      "skincare",
      "resets",
      "checkins",
      "review",
    ].map((category) => ({ category, enabled: true })),
  };
}
