import { describe, expect, it } from "vitest";
import { PALETTE, colorForTag, withAlpha } from "@/lib/colors";

describe("PALETTE", () => {
  it("has 10 unique lowercase hex colors with ids", () => {
    expect(PALETTE).toHaveLength(10);
    const hexes = PALETTE.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(10);
    expect(new Set(PALETTE.map((c) => c.id)).size).toBe(10);
    for (const hex of hexes) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("colorForTag", () => {
  it("is deterministic for the same tag", () => {
    for (const tag of ["deep-work", "errand", "health", "写作", ""]) {
      expect(colorForTag(tag)).toBe(colorForTag(tag));
    }
  });

  it("always lands on a palette hex", () => {
    const hexes = new Set(PALETTE.map((c) => c.hex));
    for (const tag of ["a", "b", "focus", "chess", "long-tag-name-here"]) {
      expect(hexes.has(colorForTag(tag))).toBe(true);
    }
  });

  it("distributes across the palette (not all the same)", () => {
    const tags = Array.from({ length: 40 }, (_, i) => `tag-${i}`);
    const used = new Set(tags.map(colorForTag));
    expect(used.size).toBeGreaterThan(3);
  });
});

describe("withAlpha", () => {
  it("appends an alpha byte in #rrggbbaa form", () => {
    expect(withAlpha("#d98a6b", 1)).toBe("#d98a6bff");
    expect(withAlpha("#d98a6b", 0)).toBe("#d98a6b00");
    expect(withAlpha("#6FC7A8", 0.5)).toBe("#6fc7a880");
    expect(withAlpha("#abc", 1)).toBe("#aabbccff");
  });

  it("clamps alpha into [0, 1]", () => {
    expect(withAlpha("#8e9fb5", 2)).toBe("#8e9fb5ff");
    expect(withAlpha("#8e9fb5", -1)).toBe("#8e9fb500");
  });

  it("always matches the 8-digit hex format", () => {
    for (const a of [0, 0.13, 0.4, 0.66, 0.85, 1]) {
      expect(withAlpha(colorForTag("x"), a)).toMatch(/^#[0-9a-f]{8}$/);
    }
  });
});
