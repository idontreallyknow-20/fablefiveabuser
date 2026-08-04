import { describe, expect, it } from "vitest";
import {
  backdropFilter,
  isParticleLayer,
  PARTICLE_EFFECTS,
  particleOnlyTheme,
} from "@/lib/backgrounds/filters";
import {
  BUILTIN_BACKGROUNDS,
  getBuiltinBackground,
  isBuiltinBackgroundId,
} from "@/lib/backgrounds/builtins";
import { THEMES } from "@/lib/themes/registry";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings/store";

describe("backdropFilter", () => {
  it("returns none when everything is neutral", () => {
    expect(backdropFilter({ dim: 0, blur: 0, desaturate: 0 })).toBe("none");
  });

  it("maps dim to brightness", () => {
    expect(backdropFilter({ dim: 0.35, blur: 0, desaturate: 0 })).toBe("brightness(0.65)");
  });

  it("combines all three adjustments in order", () => {
    expect(backdropFilter({ dim: 0.2, blur: 8, desaturate: 0.5 })).toBe(
      "brightness(0.8) saturate(0.5) blur(8px)",
    );
  });

  it("clamps out-of-range values", () => {
    expect(backdropFilter({ dim: 2, blur: 100, desaturate: -1 })).toBe(
      "brightness(0.2) blur(24px)",
    );
    expect(backdropFilter({ dim: NaN, blur: NaN, desaturate: NaN })).toBe("none");
  });
});

describe("particleOnlyTheme", () => {
  it("keeps only particle overlays for rainy-city", () => {
    const derived = particleOnlyTheme(THEMES["rainy-city"]);
    const effects = derived.layers.map((l) => l.effect);
    expect(effects).toEqual(["fog", "rain", "droplets"]);
  });

  it("drops scene composition layers everywhere", () => {
    const sceneEffects = [
      "sky-gradient",
      "city-lights",
      "neon-signs",
      "lamp-glow",
      "branches",
      "caustics",
      "clouds",
      "moon",
    ];
    for (const theme of Object.values(THEMES)) {
      const derived = particleOnlyTheme(theme);
      for (const layer of derived.layers) {
        expect(sceneEffects).not.toContain(layer.effect);
        expect(PARTICLE_EFFECTS.has(layer.effect)).toBe(true);
        expect(isParticleLayer(layer)).toBe(true);
      }
    }
  });

  it("preserves theme identity and layer configs", () => {
    const theme = THEMES.observatory;
    const derived = particleOnlyTheme(theme);
    expect(derived.id).toBe(theme.id);
    expect(derived.sky).toEqual(theme.sky);
    const stars = derived.layers.find((l) => l.effect === "stars");
    expect(stars).toEqual(theme.layers.find((l) => l.effect === "stars"));
  });

  it("luxe (sky only) yields no layers", () => {
    expect(particleOnlyTheme(THEMES.luxe).layers).toEqual([]);
  });
});

describe("builtin backgrounds", () => {
  it("all ids are builtin-prefixed and resolvable", () => {
    for (const b of BUILTIN_BACKGROUNDS) {
      expect(isBuiltinBackgroundId(b.id)).toBe(true);
      expect(getBuiltinBackground(b.id)).toBe(b);
      expect(b.path.startsWith("/backgrounds/")).toBe(true);
    }
  });

  it("rejects non-builtin ids", () => {
    expect(isBuiltinBackgroundId(null)).toBe(false);
    expect(isBuiltinBackgroundId("some-uuid")).toBe(false);
    expect(getBuiltinBackground("builtin:unknown")).toBeNull();
  });
});

describe("settings normalization", () => {
  it("fills background defaults for legacy settings blobs", () => {
    const s = normalizeSettings({ theme: "tokyo" });
    expect(s.background).toEqual(DEFAULT_SETTINGS.background);
  });

  it("deep-fills a partial background object", () => {
    const s = normalizeSettings({ background: { id: "builtin:dusk" } });
    expect(s.background.id).toBe("builtin:dusk");
    expect(s.background.dim).toBe(DEFAULT_SETTINGS.background.dim);
    expect(s.background.particles).toBe(true);
  });
});
