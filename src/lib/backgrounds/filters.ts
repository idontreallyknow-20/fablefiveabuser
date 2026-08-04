// Pure helpers for the custom-background system: the CSS filter applied to
// the backdrop media, and the theme-layer filtering that decides what the
// atmosphere canvas still draws on top of a custom background.

import type { EffectKind, SceneLayerConfig, ThemeDef } from "@/lib/themes/registry";

export interface BackgroundAdjust {
  /** 0..0.8 darkening (maps to brightness) */
  dim: number;
  /** blur radius in px, 0..24 */
  blur: number;
  /** 0..1 desaturation (maps to saturate) */
  desaturate: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;

/** CSS filter string for the backdrop media element */
export function backdropFilter(adjust: BackgroundAdjust): string {
  const dim = clamp(adjust.dim, 0, 0.8);
  const blur = clamp(adjust.blur, 0, 24);
  const desat = clamp(adjust.desaturate, 0, 1);
  const parts: string[] = [];
  if (dim > 0) parts.push(`brightness(${round2(1 - dim)})`);
  if (desat > 0) parts.push(`saturate(${round2(1 - desat)})`);
  if (blur > 0) parts.push(`blur(${round2(blur)}px)`);
  return parts.length ? parts.join(" ") : "none";
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * Particle overlays keep playing over a custom background; everything that
 * composes a scene of its own (sky, architecture, light sources) is skipped.
 */
export const PARTICLE_EFFECTS: ReadonlySet<EffectKind> = new Set<EffectKind>([
  "rain",
  "snow",
  "dust",
  "stars",
  "fog",
  "droplets",
  "embers",
  "shooting-stars",
]);

export function isParticleLayer(layer: SceneLayerConfig): boolean {
  return PARTICLE_EFFECTS.has(layer.effect);
}

/** Derived theme drawn over a custom background: particle overlays only. */
export function particleOnlyTheme(theme: ThemeDef): ThemeDef {
  return { ...theme, layers: theme.layers.filter(isParticleLayer) };
}
