import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings/store";

describe("normalizeSettings ui deep-fill", () => {
  it("fills the whole ui group for legacy blobs without one", () => {
    const s = normalizeSettings({ theme: "tokyo" });
    expect(s.ui).toEqual(DEFAULT_SETTINGS.ui);
    expect(s.ui).toEqual({
      accent: null,
      radius: "soft",
      density: "cozy",
      fontScale: 1,
      clockSeconds: false,
      contrast: "normal",
    });
  });

  it("deep-fills a partial ui object", () => {
    const s = normalizeSettings({ ui: { radius: "round" } });
    expect(s.ui.radius).toBe("round");
    expect(s.ui.density).toBe("cozy");
    expect(s.ui.fontScale).toBe(1);
    expect(s.ui.accent).toBeNull();
    expect(s.ui.clockSeconds).toBe(false);
    expect(s.ui.contrast).toBe("normal");
  });

  it("preserves a fully specified ui object", () => {
    const ui = {
      accent: "#7f9be0",
      radius: "sharp",
      density: "airy",
      fontScale: 1.1,
      clockSeconds: true,
      contrast: "high",
    } as const;
    const s = normalizeSettings({ ui });
    expect(s.ui).toEqual(ui);
  });

  it("coerces an out-of-range fontScale back to 1", () => {
    const s = normalizeSettings({ ui: { fontScale: 1.5 } });
    expect(s.ui.fontScale).toBe(1);
  });

  it("does not mutate defaults when filling", () => {
    normalizeSettings({ ui: { density: "compact" } });
    expect(DEFAULT_SETTINGS.ui.density).toBe("cozy");
  });

  it("handles junk input", () => {
    expect(normalizeSettings(null).ui).toEqual(DEFAULT_SETTINGS.ui);
    expect(normalizeSettings("nope").ui).toEqual(DEFAULT_SETTINGS.ui);
  });
});
