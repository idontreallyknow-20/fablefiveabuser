"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THEME, type MotionLevel, type ThemeId } from "@/lib/themes/registry";
import type { TodayLayout } from "@/lib/widgets/types";
import { migrateLegacyLayout } from "@/lib/settings/layout";

export interface AutoSchedule {
  enabled: boolean;
  /** switch by sunrise/sunset instead of fixed hours */
  followSun: boolean;
  dayTheme: ThemeId;
  nightTheme: ThemeId;
  /** fixed-hour fallback, 24h clock */
  dayStart: string;
  nightStart: string;
}

export interface AmbientSettings {
  /** minutes of inactivity before ambient mode starts; 0 disables */
  autoAfterMin: number;
  wakeLock: boolean;
  /** shift composition slightly to protect OLED panels */
  burnInProtection: boolean;
  /** dim further between these hours */
  nightDimming: boolean;
  showReminder: boolean;
}

export interface BackgroundSettings {
  /** user_backgrounds row id, `builtin:*` id, or null for the theme scene */
  id: string | null;
  /** darkening 0..0.8 */
  dim: number;
  /** blur px 0..24 */
  blur: number;
  /** desaturation 0..1 */
  desaturate: number;
  /** keep the theme's particle overlays over the backdrop */
  particles: boolean;
}

export interface UiSettings {
  /** hex accent override; null follows the theme accent */
  accent: string | null;
  radius: "sharp" | "soft" | "round";
  density: "compact" | "cozy" | "airy";
  fontScale: 0.9 | 1 | 1.1;
  clockSeconds: boolean;
  contrast: "normal" | "high";
}

export interface ModuleToggles {
  train: boolean;
  reflect: boolean;
  sounds: boolean;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IntegrationSettings {
  /** discord webhook url; posts go straight from the client */
  discordWebhook: string;
}

export interface OrbitSettings {
  theme: ThemeId;
  background: BackgroundSettings;
  ui: UiSettings;
  /** optional app areas; off removes them from nav and the widget sheet */
  modules: ModuleToggles;
  nutrition: NutritionTargets;
  integrations: IntegrationSettings;
  motion: MotionLevel;
  /** let the scene step its own quality down on slow machines */
  adaptivePerf: boolean;
  reducedMotion: boolean;
  brightness: number; // 0.6 .. 1
  uiOpacity: number; // 0.7 .. 1
  uiBlur: number; // px 0..16
  textScale: number; // 0.9 .. 1.2
  density: "compact" | "comfortable";
  weatherReactive: boolean;
  timeReactive: boolean;
  autoSchedule: AutoSchedule;
  ambient: AmbientSettings;
  location: { name: string; lat: number; lon: number; timezone: string };
  quietHours: { enabled: boolean; start: string; end: string };
  pinLock: { enabled: boolean; hash: string };
  /** self-reported energy for today's Guide recommendations */
  energyToday: "low" | "medium" | "high" | null;
  /** free-form Today grid; null renders the default preset */
  todayLayout: TodayLayout | null;
  /** manual scene overrides; null follows reality */
  weatherOverride: "rain" | "drizzle" | "snow" | "fog" | "clear" | "clouds" | "storm" | null;
  phaseOverride:
    | "predawn"
    | "sunrise"
    | "morning"
    | "midday"
    | "golden"
    | "sunset"
    | "blue-hour"
    | "night"
    | null;
}

export const DEFAULT_SETTINGS: OrbitSettings = {
  theme: DEFAULT_THEME,
  background: { id: null, dim: 0.35, blur: 0, desaturate: 0, particles: true },
  ui: {
    accent: null,
    radius: "soft",
    density: "cozy",
    fontScale: 1,
    clockSeconds: false,
    contrast: "normal",
  },
  modules: { train: true, reflect: true, sounds: true },
  nutrition: { calories: 2400, protein: 150, carbs: 250, fat: 80 },
  integrations: { discordWebhook: "" },
  motion: "balanced",
  adaptivePerf: true,
  reducedMotion: false,
  brightness: 1,
  uiOpacity: 1,
  uiBlur: 0,
  textScale: 1,
  density: "comfortable",
  weatherReactive: true,
  timeReactive: true,
  autoSchedule: {
    enabled: false,
    followSun: true,
    dayTheme: "living-sky",
    nightTheme: "rainy-city",
    dayStart: "07:00",
    nightStart: "20:00",
  },
  ambient: {
    autoAfterMin: 10,
    wakeLock: true,
    burnInProtection: true,
    nightDimming: true,
    showReminder: true,
  },
  location: {
    name: "Richmond Hill, Ontario",
    lat: 43.8828,
    lon: -79.4403,
    timezone: "America/Toronto",
  },
  quietHours: { enabled: true, start: "23:00", end: "08:00" },
  pinLock: { enabled: false, hash: "" },
  energyToday: null,
  todayLayout: null,
  weatherOverride: null,
  phaseOverride: null,
};

interface SettingsState {
  settings: OrbitSettings;
  /** true once the profile copy has been loaded and merged */
  hydratedFromProfile: boolean;
  set: (patch: Partial<OrbitSettings>) => void;
  replaceAll: (next: OrbitSettings) => void;
  markProfileHydrated: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      hydratedFromProfile: false,
      set: (patch) => {
        // stamp local edits so profile hydration can't clobber newer ones
        try {
          localStorage.setItem(
            "orbit-settings-modified-at",
            JSON.stringify(new Date().toISOString()),
          );
        } catch {}
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },
      replaceAll: (next) => set({ settings: next }),
      markProfileHydrated: () => set({ hydratedFromProfile: true }),
    }),
    {
      name: "orbit-settings",
      partialize: (s) => ({ settings: s.settings }),
      // deep-fill defaults so settings added in newer builds hydrate correctly
      merge: (persisted, current) => {
        const p = persisted as { settings?: Partial<OrbitSettings> } | undefined;
        return {
          ...current,
          settings: normalizeSettings(p?.settings ?? {}),
        };
      },
    },
  ),
);

/**
 * Fills defaults and migrates retired shapes (the preset-based Today
 * layout becomes a starter grid). Used by both persistence layers.
 */
export function normalizeSettings(raw: unknown): OrbitSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<OrbitSettings> & {
    layoutPreset?: string;
    hiddenWidgets?: string[];
  };
  const settings: OrbitSettings = { ...DEFAULT_SETTINGS, ...r };
  // nested objects deep-fill so fields added later hydrate with defaults
  settings.background = { ...DEFAULT_SETTINGS.background, ...(r.background ?? {}) };
  settings.ui = { ...DEFAULT_SETTINGS.ui, ...(r.ui ?? {}) };
  settings.integrations = { ...DEFAULT_SETTINGS.integrations, ...(r.integrations ?? {}) };
  if (![0.9, 1, 1.1].includes(settings.ui.fontScale)) settings.ui.fontScale = 1;
  if (!settings.todayLayout && r.layoutPreset) {
    settings.todayLayout = migrateLegacyLayout(r.layoutPreset, r.hiddenWidgets ?? []);
  }
  return settings;
}

/** Applies settings to the document: theme attribute, CSS variables, cookie. */
export function applySettingsToDocument(s: OrbitSettings) {
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.motion =
    s.reducedMotion || s.motion === "low" ? "off" : s.motion;
  // note: dataset.density / radius / contrast belong to <UiVars/> (ui group)
  root.style.setProperty("--ui-opacity", String(s.uiOpacity));
  root.style.setProperty("--ui-blur", `${s.uiBlur}px`);
  root.style.setProperty("--ui-brightness", String(s.brightness));
  root.style.setProperty("--text-scale", String(s.textScale));
  document.cookie = `orbit-theme=${s.theme};path=/;max-age=31536000;samesite=lax`;
}
