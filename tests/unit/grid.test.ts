import { describe, expect, it } from "vitest";
import { clampInstance, compact, type WidgetInstance } from "@/lib/widgets/types";
import { migrateLegacyLayout } from "@/lib/settings/layout";

const inst = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): WidgetInstance => ({ id, kind: "notes", x, y, w, h });

describe("clampInstance", () => {
  it("clamps size and keeps the widget on the grid", () => {
    const c = clampInstance(inst("a", 10, 0, 6, 9), { w: 2, h: 2 }, { w: 8, h: 8 });
    expect(c.w).toBe(6);
    expect(c.h).toBe(8);
    expect(c.x).toBe(6); // pushed left so x + w <= 12
  });
  it("floors at minimums and zero position", () => {
    const c = clampInstance(inst("a", -3, -2, 1, 1), { w: 2, h: 2 }, { w: 8, h: 8 });
    expect(c).toMatchObject({ x: 0, y: 0, w: 2, h: 2 });
  });
});

describe("compact", () => {
  it("pulls widgets up into free space", () => {
    const out = compact([inst("a", 0, 5, 6, 2), inst("b", 6, 3, 6, 2)]);
    expect(out.find((i) => i.id === "a")!.y).toBe(0);
    expect(out.find((i) => i.id === "b")!.y).toBe(0);
  });
  it("stacks overlapping columns without overlap", () => {
    const out = compact([inst("a", 0, 0, 6, 2), inst("b", 2, 1, 6, 2)]);
    const a = out.find((i) => i.id === "a")!;
    const b = out.find((i) => i.id === "b")!;
    expect(a.y).toBe(0);
    expect(b.y).toBe(2); // pushed below a
  });
  it("keeps side-by-side widgets on the same row", () => {
    const out = compact([inst("a", 0, 0, 6, 2), inst("b", 6, 0, 6, 2)]);
    expect(out.every((i) => i.y === 0)).toBe(true);
  });
  it("is deterministic for equal positions", () => {
    const widgets = [inst("b", 0, 0, 12, 2), inst("a", 0, 2, 12, 2)];
    expect(compact(widgets)).toEqual(compact(widgets));
  });
});

describe("migrateLegacyLayout", () => {
  it("maps old presets and honors hidden widgets", () => {
    const layout = migrateLegacyLayout("command", ["player", "calendar"]);
    const kinds = layout.widgets.map((w) => w.kind);
    expect(kinds).toContain("priorities");
    expect(kinds).not.toContain("player");
    expect(kinds).not.toContain("calendar-today");
  });
  it("falls back to command for unknown presets", () => {
    expect(migrateLegacyLayout("bogus", []).widgets.length).toBeGreaterThan(0);
  });
});
