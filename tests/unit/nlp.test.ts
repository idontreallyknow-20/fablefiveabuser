import { describe, expect, it } from "vitest";
import { parseEntry } from "@/lib/nlp/date";

// Tuesday, August 4 2026, 09:00 local
const NOW = new Date(2026, 7, 4, 9, 0, 0);

describe("parseEntry", () => {
  it("passes through titles without dates", () => {
    expect(parseEntry("buy milk", NOW)).toEqual({
      title: "buy milk",
      dueDate: null,
      scheduledAt: null,
    });
  });

  it("today and tomorrow", () => {
    expect(parseEntry("water plants today", NOW).dueDate).toBe("2026-08-04");
    expect(parseEntry("water plants today", NOW).title).toBe("water plants");
    expect(parseEntry("call mom tomorrow", NOW).dueDate).toBe("2026-08-05");
    expect(parseEntry("call mom tmr", NOW).dueDate).toBe("2026-08-05");
  });

  it("weekday names, including abbreviations", () => {
    expect(parseEntry("physics test friday", NOW).dueDate).toBe("2026-08-07");
    expect(parseEntry("physics test fri", NOW).dueDate).toBe("2026-08-07");
    expect(parseEntry("gym mon", NOW).dueDate).toBe("2026-08-10");
  });

  it("same-day weekday rolls a week ahead", () => {
    expect(parseEntry("standup tuesday", NOW).dueDate).toBe("2026-08-11");
  });

  it("next weekday skips a week", () => {
    expect(parseEntry("review next friday", NOW).dueDate).toBe("2026-08-14");
    expect(parseEntry("review next friday", NOW).title).toBe("review");
  });

  it("next week", () => {
    expect(parseEntry("plan sprint next week", NOW).dueDate).toBe("2026-08-11");
  });

  it("in N days", () => {
    expect(parseEntry("renew pass in 10 days", NOW).dueDate).toBe("2026-08-14");
    expect(parseEntry("renew pass in 10 days", NOW).title).toBe("renew pass");
  });

  it("month day, both orders, with year rollover", () => {
    expect(parseEntry("dentist aug 12", NOW).dueDate).toBe("2026-08-12");
    expect(parseEntry("dentist 12 aug", NOW).dueDate).toBe("2026-08-12");
    expect(parseEntry("taxes mar 1", NOW).dueDate).toBe("2027-03-01");
    expect(parseEntry("party sept 5th", NOW).dueDate).toBe("2026-09-05");
  });

  it("times attach to the date", () => {
    const r = parseEntry("chemistry test friday 3pm", NOW);
    expect(r.title).toBe("chemistry test");
    expect(r.dueDate).toBe("2026-08-07");
    expect(new Date(r.scheduledAt!).getHours()).toBe(15);
    const r2 = parseEntry("standup tomorrow 9:30", NOW);
    expect(new Date(r2.scheduledAt!).getMinutes()).toBe(30);
  });

  it("bare time schedules today", () => {
    const r = parseEntry("meeting 4pm", NOW);
    expect(r.title).toBe("meeting");
    expect(r.dueDate).toBe("2026-08-04");
    expect(new Date(r.scheduledAt!).getHours()).toBe(16);
  });

  it("does not eat titles that merely end in ambiguous words", () => {
    expect(parseEntry("read may", NOW).dueDate).toBeNull();
    expect(parseEntry("friday", NOW).dueDate).toBeNull();
  });
});
