import { describe, expect, it } from "vitest";
import {
  expandRecurrence,
  parseRecurrence,
  describeRecurrence,
} from "@/lib/calendar/recurrence";
import { mergeCalendar, dateRange } from "@/lib/calendar/local";
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
    recurrence: null,
    checklist: [],
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("parseRecurrence", () => {
  it("accepts valid shapes and clamps interval", () => {
    expect(parseRecurrence({ freq: "daily", interval: 0 })?.interval).toBe(1);
    expect(parseRecurrence({ freq: "weekly", interval: 2, weekdays: [1, 3] })).toEqual({
      freq: "weekly",
      interval: 2,
      weekdays: [1, 3],
      until: null,
    });
  });
  it("rejects junk", () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence({ freq: "yearly" })).toBeNull();
    expect(parseRecurrence("daily")).toBeNull();
  });
});

describe("expandRecurrence", () => {
  it("daily every 2 days from anchor", () => {
    const rec = { freq: "daily" as const, interval: 2 };
    expect(expandRecurrence(rec, "2026-08-01", "2026-08-01", "2026-08-08")).toEqual([
      "2026-08-01",
      "2026-08-03",
      "2026-08-05",
      "2026-08-07",
    ]);
  });
  it("daily aligns when window starts after anchor", () => {
    const rec = { freq: "daily" as const, interval: 3 };
    expect(expandRecurrence(rec, "2026-08-01", "2026-08-05", "2026-08-11")).toEqual([
      "2026-08-07",
      "2026-08-10",
    ]);
  });
  it("weekly on chosen weekdays", () => {
    // 2026-08-03 is a Monday
    const rec = { freq: "weekly" as const, interval: 1, weekdays: [1, 5] };
    expect(expandRecurrence(rec, "2026-08-03", "2026-08-03", "2026-08-14")).toEqual([
      "2026-08-03",
      "2026-08-07",
      "2026-08-10",
      "2026-08-14",
    ]);
  });
  it("weekly defaults to the anchor weekday", () => {
    const rec = { freq: "weekly" as const, interval: 2 };
    expect(expandRecurrence(rec, "2026-08-03", "2026-08-01", "2026-08-31")).toEqual([
      "2026-08-03",
      "2026-08-17",
      "2026-08-31",
    ]);
  });
  it("monthly skips missing day-of-month", () => {
    const rec = { freq: "monthly" as const, interval: 1 };
    expect(expandRecurrence(rec, "2026-01-31", "2026-01-01", "2026-04-30")).toEqual([
      "2026-01-31",
      "2026-03-31",
    ]);
  });
  it("respects until", () => {
    const rec = { freq: "daily" as const, interval: 1, until: "2026-08-03" };
    expect(expandRecurrence(rec, "2026-08-01", "2026-08-01", "2026-08-10")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });
});

describe("describeRecurrence", () => {
  it("labels", () => {
    expect(describeRecurrence({ freq: "daily", interval: 1 })).toBe("daily");
    expect(describeRecurrence({ freq: "daily", interval: 3 })).toBe("every 3 days");
    expect(
      describeRecurrence({ freq: "weekly", interval: 1, weekdays: [1, 5] }),
    ).toBe("weekly · Mon Fri");
  });
});

describe("dateRange", () => {
  it("inclusive and bounded", () => {
    expect(dateRange("2026-08-01", "2026-08-03")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });
});

describe("mergeCalendar", () => {
  it("buckets tasks by due date and scheduled time", () => {
    const buckets = mergeCalendar({
      tasks: [
        makeTask({ id: "a", title: "Due thing", due_date: "2026-08-05" }),
        makeTask({
          id: "b",
          title: "Meeting prep",
          scheduled_at: "2026-08-05T14:30:00",
        }),
      ],
      events: [],
      routines: [],
      from: "2026-08-01",
      to: "2026-08-07",
    });
    const day = buckets.get("2026-08-05")!;
    expect(day).toHaveLength(2);
    expect(day[0].title).toBe("Due thing"); // all-day sorts first
    expect(day[1].time).toBe("14:30");
  });

  it("projects recurrence as ghosts without duplicating the anchor", () => {
    const buckets = mergeCalendar({
      tasks: [
        makeTask({
          id: "r",
          title: "Water plants",
          due_date: "2026-08-03",
          recurrence: { freq: "daily", interval: 2 },
        }),
      ],
      events: [],
      routines: [],
      from: "2026-08-01",
      to: "2026-08-07",
    });
    expect(buckets.get("2026-08-03")![0].ghost).toBe(false);
    expect(buckets.get("2026-08-05")![0].ghost).toBe(true);
    expect(buckets.get("2026-08-07")![0].ghost).toBe(true);
    expect(buckets.get("2026-08-04")).toBeUndefined();
  });

  it("includes events and routine schedules", () => {
    const buckets = mergeCalendar({
      tasks: [],
      events: [
        {
          id: "e1",
          title: "Dentist",
          startsAt: "2026-08-06T09:00:00",
          endsAt: "2026-08-06T10:00:00",
          allDay: false,
          color: null,
          calendarId: "primary",
        },
      ],
      routines: [
        {
          id: "ro1",
          name: "Morning skincare",
          enabled: true,
          schedule: { times: ["08:00"], days: [0, 1, 2, 3, 4, 5, 6] },
        },
      ],
      from: "2026-08-06",
      to: "2026-08-06",
    });
    const day = buckets.get("2026-08-06")!;
    expect(day.map((i) => i.kind).sort()).toEqual(["event", "routine"]);
  });
});
