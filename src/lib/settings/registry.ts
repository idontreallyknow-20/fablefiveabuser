"use client";

// Generic settings registry: every small setting registers here once and
// renders in the searchable index at /space. Labels are three words max;
// controls are typed; values address the store by dot path.

import type { OrbitSettings } from "@/lib/settings/store";

export type SettingControl =
  | { kind: "toggle" }
  | { kind: "slider"; min: number; max: number; step: number; format?: (v: number) => string }
  | { kind: "segmented"; options: { value: string; label: string }[] }
  | { kind: "number"; min: number; max: number; step: number };

export interface SettingDef {
  id: string;
  /** three words max */
  label: string;
  section: string;
  path: string; // dot path into OrbitSettings
  control: SettingControl;
  /** extra match terms for search */
  keywords?: string;
}

export function getPath(settings: OrbitSettings, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], settings);
}

export function setPath(settings: OrbitSettings, path: string, value: unknown): Partial<OrbitSettings> {
  const keys = path.split(".");
  if (keys.length === 1) return { [keys[0]]: value } as Partial<OrbitSettings>;
  const [head, ...rest] = keys;
  const current = (settings as unknown as Record<string, unknown>)[head];
  let patched: unknown = value;
  for (let i = rest.length - 1; i >= 0; i--) {
    const base =
      i === 0
        ? (current as Record<string, unknown>)
        : (rest
            .slice(0, i)
            .reduce<unknown>(
              (acc, k) => (acc as Record<string, unknown> | undefined)?.[k],
              current,
            ) as Record<string, unknown>);
    patched = { ...(base ?? {}), [rest[i]]: patched };
  }
  return { [head]: patched } as Partial<OrbitSettings>;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const SETTINGS_REGISTRY: SettingDef[] = [
  // scene
  { id: "weather-reactive", label: "Live weather", section: "Scene", path: "weatherReactive", control: { kind: "toggle" }, keywords: "rain snow sync" },
  { id: "time-reactive", label: "Live daylight", section: "Scene", path: "timeReactive", control: { kind: "toggle" }, keywords: "sunrise sunset phase" },
  { id: "album-glow", label: "Album light", section: "Scene", path: "albumGlow", control: { kind: "toggle" }, keywords: "spotify music color" },
  { id: "adaptive-perf", label: "Adaptive performance", section: "Scene", path: "adaptivePerf", control: { kind: "toggle" }, keywords: "fps slow speed" },
  {
    id: "motion",
    label: "Motion",
    section: "Scene",
    path: "motion",
    control: {
      kind: "segmented",
      options: [
        { value: "low", label: "Low" },
        { value: "balanced", label: "Balanced" },
        { value: "cinematic", label: "Cinematic" },
      ],
    },
  },
  { id: "reduced-motion", label: "Reduce motion", section: "Scene", path: "reducedMotion", control: { kind: "toggle" } },
  { id: "bg-particles", label: "Backdrop particles", section: "Scene", path: "background.particles", control: { kind: "toggle" }, keywords: "custom background rain overlay" },
  { id: "bg-dim", label: "Backdrop dim", section: "Scene", path: "background.dim", control: { kind: "slider", min: 0, max: 0.8, step: 0.05, format: pct } },
  { id: "bg-blur", label: "Backdrop blur", section: "Scene", path: "background.blur", control: { kind: "slider", min: 0, max: 24, step: 1, format: (v) => `${v}px` } },

  // interface
  { id: "brightness", label: "Brightness", section: "Interface", path: "brightness", control: { kind: "slider", min: 0.6, max: 1, step: 0.05, format: pct } },
  { id: "ui-blur", label: "Panel blur", section: "Interface", path: "uiBlur", control: { kind: "slider", min: 0, max: 16, step: 1, format: (v) => `${v}px` } },
  { id: "ui-opacity", label: "Panel opacity", section: "Interface", path: "uiOpacity", control: { kind: "slider", min: 0.7, max: 1, step: 0.05, format: pct } },
  { id: "text-scale", label: "Text size", section: "Interface", path: "textScale", control: { kind: "slider", min: 0.9, max: 1.2, step: 0.05, format: pct } },
  {
    id: "density",
    label: "Density",
    section: "Interface",
    path: "density",
    control: {
      kind: "segmented",
      options: [
        { value: "comfortable", label: "Comfortable" },
        { value: "compact", label: "Compact" },
      ],
    },
  },

  // modules
  { id: "module-train", label: "Train", section: "Modules", path: "modules.train", control: { kind: "toggle" }, keywords: "workout gym fitness" },
  { id: "module-reflect", label: "Reflect", section: "Modules", path: "modules.reflect", control: { kind: "toggle" }, keywords: "selfcare journal checkin skincare" },
  { id: "module-sounds", label: "Sounds", section: "Modules", path: "modules.sounds", control: { kind: "toggle" }, keywords: "soundboard audio" },
  { id: "module-teams", label: "Teams", section: "Modules", path: "modules.teams", control: { kind: "toggle" }, keywords: "shared katherine bonus" },

  // nutrition
  { id: "cal-target", label: "Calories", section: "Nutrition", path: "nutrition.calories", control: { kind: "number", min: 1000, max: 6000, step: 50 }, keywords: "kcal macro target" },
  { id: "protein-target", label: "Protein", section: "Nutrition", path: "nutrition.protein", control: { kind: "number", min: 20, max: 400, step: 5 }, keywords: "macro target grams" },
  { id: "carbs-target", label: "Carbs", section: "Nutrition", path: "nutrition.carbs", control: { kind: "number", min: 20, max: 700, step: 5 }, keywords: "macro target grams" },
  { id: "fat-target", label: "Fat", section: "Nutrition", path: "nutrition.fat", control: { kind: "number", min: 10, max: 250, step: 5 }, keywords: "macro target grams" },

  // ambient
  { id: "ambient-auto", label: "Auto ambient", section: "Ambient", path: "ambient.autoAfterMin", control: { kind: "slider", min: 0, max: 60, step: 5, format: (v) => (v === 0 ? "off" : `${v}m`) } },
  { id: "wake-lock", label: "Keep awake", section: "Ambient", path: "ambient.wakeLock", control: { kind: "toggle" }, keywords: "screen sleep display" },
  { id: "burn-in", label: "Burn-in shield", section: "Ambient", path: "ambient.burnInProtection", control: { kind: "toggle" }, keywords: "oled shift" },
  { id: "night-dim", label: "Night dimming", section: "Ambient", path: "ambient.nightDimming", control: { kind: "toggle" } },
  { id: "ambient-reminder", label: "Ambient reminders", section: "Ambient", path: "ambient.showReminder", control: { kind: "toggle" } },

  // quiet hours
  { id: "quiet-hours", label: "Quiet hours", section: "Notifications", path: "quietHours.enabled", control: { kind: "toggle" }, keywords: "mute silence night" },
];

export function searchSettings(query: string): SettingDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return SETTINGS_REGISTRY;
  return SETTINGS_REGISTRY.filter(
    (s) =>
      s.label.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q) ||
      (s.keywords ?? "").includes(q),
  );
}
