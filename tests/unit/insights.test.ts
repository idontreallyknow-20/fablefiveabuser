import { describe, expect, it } from "vitest";
import {
  completionsByWeekday,
  completionsPerDay,
  currentStreak,
  openVsDone,
  topTags,
  workoutVolumePerWeek,
  type VolumeEntry,
} from "@/lib/insights/compute";
import type { Task } from "@/lib/data/tasks";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    user_id: "u1",
    project_id: null,
    title: "Task",
    note: "",
    status: "todo",
    importance: 2,
    duration_min: null,
    energy: null,
    due_date: null,
    scheduled_at: null,
    scheduled_end_at: null,
    priority_date: null,
    priority_slot: null,
    deferral_count: 0,
    completed_at: null,
    links: [],
    depends_on: [],
    custom: {},
    tags: [],
    team_id: null,
    recurrence: null,
    checklist: [],
    sort_order: 0,
    created_at: "2026-01-01T00:00:00",
    updated_at: "2026-01-01T00:00:00",
    ...overrides,
  };
}

function entry(overrides: Partial<VolumeEntry> = {}): VolumeEntry {
  return { created_at: "2026-08-03T10:00:00", weight_kg: null, reps: null, ...overrides };
}

// zone-less timestamps keep the fixtures in local time, matching how the
// compute helpers bucket by local calendar day
const NOW = new Date("2026-08-04T12:00:00"); // a Tuesday

describe("completionsPerDay", () => {
  it("buckets completions into an inclusive trailing window, oldest first", () => {
    const tasks = [
      makeTask({ id: "a", completed_at: "2026-08-04T09:00:00" }),
      makeTask({ id: "b", completed_at: "2026-08-04T21:30:00" }),
      makeTask({ id: "c", completed_at: "2026-08-02T08:00:00" }),
      makeTask({ id: "d", completed_at: "2026-07-29T08:00:00" }), // outside 5-day window
      makeTask({ id: "e", completed_at: null }),
    ];
    expect(completionsPerDay(tasks, 5, NOW)).toEqual([
      { date: "2026-07-31", count: 0 },
      { date: "2026-08-01", count: 0 },
      { date: "2026-08-02", count: 1 },
      { date: "2026-08-03", count: 0 },
      { date: "2026-08-04", count: 2 },
    ]);
  });

  it("is all zeros with no tasks", () => {
    const out = completionsPerDay([], 3, NOW);
    expect(out.map((p) => p.count)).toEqual([0, 0, 0]);
  });
});

describe("completionsByWeekday", () => {
  it("maps Monday..Sunday and ignores completions outside the window", () => {
    const tasks = [
      makeTask({ id: "a", completed_at: "2026-08-03T10:00:00" }), // Mon
      makeTask({ id: "b", completed_at: "2026-08-02T10:00:00" }), // Sun
      makeTask({ id: "c", completed_at: "2026-07-31T10:00:00" }), // Fri
      makeTask({ id: "d", completed_at: "2026-07-31T23:00:00" }), // Fri
      makeTask({ id: "e", completed_at: "2026-06-01T10:00:00" }), // outside 2 weeks
    ];
    expect(completionsByWeekday(tasks, 2, NOW)).toEqual([1, 0, 0, 0, 2, 0, 1]);
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    const tasks = [
      makeTask({ id: "a", completed_at: "2026-08-04T09:00:00" }),
      makeTask({ id: "b", completed_at: "2026-08-03T09:00:00" }),
      makeTask({ id: "c", completed_at: "2026-08-03T18:00:00" }), // same day, counts once
      makeTask({ id: "d", completed_at: "2026-08-02T09:00:00" }),
      makeTask({ id: "e", completed_at: "2026-07-31T09:00:00" }), // gap on the 1st
    ];
    expect(currentStreak(tasks, NOW)).toBe(3);
  });

  it("survives a day not yet extended: streak may end yesterday", () => {
    const tasks = [
      makeTask({ id: "a", completed_at: "2026-08-03T09:00:00" }),
      makeTask({ id: "b", completed_at: "2026-08-02T09:00:00" }),
    ];
    expect(currentStreak(tasks, NOW)).toBe(2);
  });

  it("is zero when nothing was completed today or yesterday", () => {
    const tasks = [makeTask({ id: "a", completed_at: "2026-08-01T09:00:00" })];
    expect(currentStreak(tasks, NOW)).toBe(0);
    expect(currentStreak([], NOW)).toBe(0);
  });
});

describe("openVsDone", () => {
  it("splits tasks and flags overdue as a subset of open", () => {
    const tasks = [
      makeTask({ id: "a" }), // open, no due date
      makeTask({ id: "b", due_date: "2026-08-04" }), // due today: not overdue
      makeTask({ id: "c", due_date: "2026-08-01" }), // slipped
      makeTask({ id: "d", completed_at: "2026-08-02T09:00:00", due_date: "2026-08-01" }), // done late: not overdue
      makeTask({ id: "e", completed_at: "2026-08-03T09:00:00" }),
    ];
    expect(openVsDone(tasks, NOW)).toEqual({ open: 3, done: 2, overdue: 1 });
  });
});

describe("workoutVolumePerWeek", () => {
  it("keys weeks by Monday, oldest first, ending with the current week", () => {
    const out = workoutVolumePerWeek([], 3, NOW);
    expect(out.map((w) => w.week)).toEqual(["2026-07-20", "2026-07-27", "2026-08-03"]);
    expect(out.map((w) => w.volume)).toEqual([0, 0, 0]);
  });

  it("sums weight*reps when both are present, else counts the set", () => {
    const entries = [
      entry({ created_at: "2026-08-03T10:00:00", weight_kg: 60, reps: 5 }), // 300, current week
      entry({ created_at: "2026-08-04T10:00:00", weight_kg: 60, reps: 5 }), // 300, current week
      entry({ created_at: "2026-08-04T11:00:00", reps: 12 }), // bodyweight: 1 set
      entry({ created_at: "2026-07-28T10:00:00", weight_kg: 40, reps: 10 }), // 400, prior week
      entry({ created_at: "2026-07-29T10:00:00", weight_kg: 40 }), // no reps: 1 set
      entry({ created_at: "2026-06-01T10:00:00", weight_kg: 100, reps: 10 }), // outside window
    ];
    const out = workoutVolumePerWeek(entries, 2, NOW);
    expect(out).toEqual([
      { week: "2026-07-27", volume: 401 },
      { week: "2026-08-03", volume: 601 },
    ]);
  });

  it("Sunday entries belong to the week of the preceding Monday", () => {
    const out = workoutVolumePerWeek(
      [entry({ created_at: "2026-08-02T10:00:00", weight_kg: 20, reps: 10 })], // Sunday
      2,
      NOW,
    );
    expect(out[0]).toEqual({ week: "2026-07-27", volume: 200 });
  });
});

describe("topTags", () => {
  it("counts tags on completed tasks only, sorted by count then name", () => {
    const tasks = [
      makeTask({ id: "a", completed_at: "2026-08-01T09:00:00", tags: ["deep", "nerf"] }),
      makeTask({ id: "b", completed_at: "2026-08-02T09:00:00", tags: ["nerf"] }),
      makeTask({ id: "c", completed_at: "2026-08-03T09:00:00", tags: ["admin"] }),
      makeTask({ id: "d", tags: ["ignored"] }), // open: not counted
    ];
    expect(topTags(tasks)).toEqual([
      { tag: "nerf", count: 2 },
      { tag: "admin", count: 1 },
      { tag: "deep", count: 1 },
    ]);
  });

  it("respects the limit and skips blank tags", () => {
    const tasks = [
      makeTask({ id: "a", completed_at: "2026-08-01T09:00:00", tags: ["a", "b", "c", " "] }),
    ];
    expect(topTags(tasks, 2)).toHaveLength(2);
  });
});
