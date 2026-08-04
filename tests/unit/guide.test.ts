import { describe, expect, it } from "vitest";
import { recommendPriorities, scoreTask, type GuideContext } from "@/lib/guide/guide";
import type { Task } from "@/lib/data/tasks";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function ctx(overrides: Partial<GuideContext> = {}): GuideContext {
  return {
    now: new Date("2026-07-16T14:00:00"),
    freeMinutes: null,
    energy: null,
    projectPriority: new Map(),
    completedIds: new Set(),
    focusProjectIds: new Set(),
    ...overrides,
  };
}

describe("scoreTask", () => {
  it("ranks overdue above due-today above undated", () => {
    const overdue = scoreTask(makeTask({ due_date: "2026-07-14" }), ctx());
    const today = scoreTask(makeTask({ due_date: "2026-07-16" }), ctx());
    const undated = scoreTask(makeTask(), ctx());
    expect(overdue.score).toBeGreaterThan(today.score);
    expect(today.score).toBeGreaterThan(undated.score);
    expect(overdue.reasons.join(" ")).toContain("overdue");
  });

  it("penalizes tasks blocked by incomplete dependencies", () => {
    const blocked = scoreTask(
      makeTask({ depends_on: ["missing-id"], due_date: "2026-07-16" }),
      ctx(),
    );
    expect(blocked.score).toBeLessThan(0);
    expect(blocked.reasons[0]).toContain("waiting");
  });

  it("unblocks tasks whose dependencies are complete", () => {
    const t = makeTask({ depends_on: ["done-id"] });
    const r = scoreTask(t, ctx({ completedIds: new Set(["done-id"]) }));
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("boosts repeatedly deferred tasks", () => {
    const fresh = scoreTask(makeTask(), ctx());
    const deferred = scoreTask(makeTask({ deferral_count: 3 }), ctx());
    expect(deferred.score).toBeGreaterThan(fresh.score);
  });

  it("respects energy matching", () => {
    const c = ctx({ energy: "low" });
    const lowTask = scoreTask(makeTask({ energy: "low" }), c);
    const highTask = scoreTask(makeTask({ energy: "high" }), c);
    expect(lowTask.score).toBeGreaterThan(highTask.score);
  });

  it("uses project priority and focus areas", () => {
    const c = ctx({
      projectPriority: new Map([["p1", 3]]),
      focusProjectIds: new Set(["p1"]),
    });
    const inProject = scoreTask(makeTask({ project_id: "p1" }), c);
    const solo = scoreTask(makeTask(), c);
    expect(inProject.score).toBeGreaterThan(solo.score);
  });
});

describe("recommendPriorities", () => {
  it("returns at most the requested count, sorted by score", () => {
    const tasks = [
      makeTask({ title: "a" }),
      makeTask({ title: "urgent", due_date: "2026-07-16", importance: 3 }),
      makeTask({ title: "c" }),
      makeTask({ title: "d" }),
    ];
    const recs = recommendPriorities(tasks, ctx(), 3);
    expect(recs).toHaveLength(3);
    expect(recs[0].task.title).toBe("urgent");
    expect(recs[0].score).toBeGreaterThanOrEqual(recs[1].score);
  });

  it("skips completed tasks and current priorities", () => {
    const tasks = [
      makeTask({ completed_at: new Date().toISOString() }),
      makeTask({ priority_slot: 1 }),
      makeTask({ title: "free" }),
    ];
    const recs = recommendPriorities(tasks, ctx(), 3);
    expect(recs).toHaveLength(1);
    expect(recs[0].task.title).toBe("free");
  });
});
