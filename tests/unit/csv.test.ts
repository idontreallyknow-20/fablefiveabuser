import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/export/csv";

describe("csv export", () => {
  it("passes plain cells through", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell(42)).toBe("42");
  });

  it("empties null and undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes, and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("joins arrays with semicolons", () => {
    expect(csvCell(["school", "urgent"])).toBe("school; urgent");
  });

  it("builds a complete document with CRLF rows", () => {
    const csv = toCsv(["title", "due"], [["Buy milk", "2026-08-05"], ['The "big" one, maybe', null]]);
    expect(csv).toBe('title,due\r\nBuy milk,2026-08-05\r\n"The ""big"" one, maybe",');
  });
});
