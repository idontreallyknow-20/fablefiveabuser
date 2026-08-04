import { describe, expect, it } from "vitest";
import { parseLrc } from "@/lib/lyrics/lrc";

describe("parseLrc", () => {
  it("parses [mm:ss.xx] lines into seconds + text", () => {
    const out = parseLrc("[00:12.34] Hello there\n[01:05.50] Second line");
    expect(out).toEqual([
      { t: 12.34, line: "Hello there" },
      { t: 65.5, line: "Second line" },
    ]);
  });

  it("handles tags without fraction and 3-digit fractions", () => {
    const out = parseLrc("[00:07] Plain tag\n[00:09.125] Millis tag");
    expect(out[0].t).toBe(7);
    expect(out[1].t).toBeCloseTo(9.125);
  });

  it("emits one entry per time tag on repeated-tag lines", () => {
    const out = parseLrc("[00:10.00][01:10.00]Chorus line");
    expect(out).toEqual([
      { t: 10, line: "Chorus line" },
      { t: 70, line: "Chorus line" },
    ]);
  });

  it("ignores metadata tags and untimed lines", () => {
    const out = parseLrc("[ar:Artist]\n[ti:Title]\nno timestamp here\n[00:01.00] Real line");
    expect(out).toEqual([{ t: 1, line: "Real line" }]);
  });

  it("sorts output by time", () => {
    const out = parseLrc("[01:00.00] later\n[00:30.00] earlier");
    expect(out.map((l) => l.line)).toEqual(["earlier", "later"]);
  });

  it("keeps empty timed lines (instrumental gaps)", () => {
    const out = parseLrc("[00:01.00] words\n[00:05.00]\n[00:09.00] more");
    expect(out).toHaveLength(3);
    expect(out[1]).toEqual({ t: 5, line: "" });
  });

  it("handles CRLF input and empty strings", () => {
    expect(parseLrc("")).toEqual([]);
    const out = parseLrc("[00:01.00] a\r\n[00:02.00] b");
    expect(out).toHaveLength(2);
    expect(out[1].line).toBe("b");
  });

  it("supports minutes beyond 99 (long tracks)", () => {
    const out = parseLrc("[100:00.00] far out");
    expect(out[0].t).toBe(6000);
  });
});
