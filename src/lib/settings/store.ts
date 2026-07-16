"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THEME, type MotionLevel, type ThemeId } from "@/lib/themes/registry";

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

export interface OrbitSettings {
  theme: ThemeId;
  motion: MotionLevel;
  reducedMotion: boolean;
  brightness: number; // 0.6 .. 1
  uiOpacity: number; // 0.7 .. 1
  uiBlur: number; // px 0..16
  textScale: number; // 0.9 .. 1.2
  density: "compact" | "comfortable";
  weatherReactive: boolean;
  timeReactive: boolean;
  albumGlow: boolean;
  autoSchedule: AutoSchedule;
  ambient: AmbientSettings;
  location: { name: string; lat: number; lon: number; timezone: string };
  quietHours: { enabled: boolean; start: string; end: string };
  pinLock: { enabled: boolean; hash: string };
  /** self-reported energy for today's Guide recommendations */
  energyToday: "low" | "medium" | "high" | null;
  /** spotify uri of the playlist offered in focus mode */
  focusPlaylistUri: string | null;
  /** today layout preset + individually hidden widgets */
  layoutPreset: "command" | "calm" | "music" | "project" | "calendar" | "mobile";
  hiddenWidgets: string[];
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
  motion: "balanced",
  reducedMotion: false,
  brightness: 1,
  uiOpacity: 1,
  uiBlur: 0,
  textScale: 1,
  density: "comfortable",
  weatherReactive: true,
  timeReactive: true,
  albumGlow: true,
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
  focusPlaylistUri: null,
  layoutPreset: "command",
  hiddenWidgets: [],
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
      set: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      replaceAll: (next) => set({ settings: next }),
      markProfileHydrated: () => set({ hydratedFromProfile: true }),
    }),
    {
      name: "orbit-settings",
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
);

/** Applies settings to the document: theme attribute, CSS variables, cookie. */
export function applySettingsToDocument(s: OrbitSettings) {
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.motion =
    s.reducedMotion || s.motion === "low" ? "off" : s.motion;
  root.dataset.density = s.density;
  root.style.setProperty("--ui-opacity", String(s.uiOpacity));
  root.style.setProperty("--ui-blur", `${s.uiBlur}px`);
  root.style.setProperty("--ui-brightness", String(s.brightness));
  root.style.setProperty("--text-scale", String(s.textScale));
  document.cookie = `orbit-theme=${s.theme};path=/;max-age=31536000;samesite=lax`;
}
