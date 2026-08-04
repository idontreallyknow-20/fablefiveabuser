"use client";

// Widget catalog for the Today grid. Sizes are in grid cells
// (12 columns, ~92px rows). New widgets register here and instantly
// appear in the add-widget sheet.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { WidgetKind } from "@/lib/widgets/types";
import type { WidgetProps } from "@/components/widgets/SmallWidgets";

export interface WidgetDef {
  kind: WidgetKind;
  name: string;
  component: ComponentType<WidgetProps>;
  min: { w: number; h: number };
  max: { w: number; h: number };
  default: { w: number; h: number };
  /** wrap in a surface card (self-styling widgets opt out) */
  chrome: boolean;
}

const lazyProps = <T extends object>(loader: () => Promise<ComponentType<T>>) =>
  dynamic(loader, { ssr: false }) as unknown as ComponentType<WidgetProps>;

export const WIDGETS: Record<WidgetKind, WidgetDef> = {
  team: {
    kind: "team",
    name: "Team",
    component: lazyProps(() => import("@/components/team/TeamWidget").then((m) => m.TeamWidget)),
    min: { w: 2, h: 2 },
    max: { w: 6, h: 4 },
    default: { w: 3, h: 3 },
    chrome: false,
  },
  priorities: {
    kind: "priorities",
    name: "Priorities",
    component: lazyProps(() => import("@/components/today/Priorities").then((m) => m.Priorities)),
    min: { w: 4, h: 3 },
    max: { w: 12, h: 8 },
    default: { w: 7, h: 5 },
    chrome: false,
  },
  player: {
    kind: "player",
    name: "Player",
    component: lazyProps(() => import("@/components/spotify/PlayerCard").then((m) => m.PlayerCard)),
    min: { w: 3, h: 2 },
    max: { w: 8, h: 4 },
    default: { w: 5, h: 2 },
    chrome: false,
  },
  "calendar-today": {
    kind: "calendar-today",
    name: "Today's events",
    component: lazyProps(() => import("@/components/calendar/TodayEvents").then((m) => m.TodayEvents)),
    min: { w: 3, h: 2 },
    max: { w: 8, h: 6 },
    default: { w: 5, h: 3 },
    chrome: false,
  },
  routines: {
    kind: "routines",
    name: "Routines",
    component: lazyProps(() => import("@/components/routines/RoutinesDue").then((m) => m.RoutinesDue)),
    min: { w: 3, h: 2 },
    max: { w: 8, h: 6 },
    default: { w: 5, h: 3 },
    chrome: false,
  },
  "due-soon": {
    kind: "due-soon",
    name: "Due soon",
    component: lazyProps(() => import("@/components/today/DueSoon").then((m) => m.DueSoon)),
    min: { w: 3, h: 2 },
    max: { w: 8, h: 6 },
    default: { w: 5, h: 3 },
    chrome: false,
  },
  "weather-week": {
    kind: "weather-week",
    name: "Forecast",
    component: lazyProps(() =>
      import("@/components/widgets/SmallWidgets").then((m) => m.WeatherWeekWidget),
    ),
    min: { w: 3, h: 2 },
    max: { w: 8, h: 3 },
    default: { w: 4, h: 2 },
    chrome: true,
  },
  notes: {
    kind: "notes",
    name: "Notes",
    component: lazyProps(() => import("@/components/widgets/SmallWidgets").then((m) => m.NotesWidget)),
    min: { w: 2, h: 2 },
    max: { w: 8, h: 8 },
    default: { w: 4, h: 3 },
    chrome: true,
  },
  countdown: {
    kind: "countdown",
    name: "Countdown",
    component: lazyProps(() =>
      import("@/components/widgets/SmallWidgets").then((m) => m.CountdownWidget),
    ),
    min: { w: 2, h: 2 },
    max: { w: 4, h: 3 },
    default: { w: 2, h: 2 },
    chrome: true,
  },
  pomodoro: {
    kind: "pomodoro",
    name: "Timer",
    component: lazyProps(() =>
      import("@/components/widgets/SmallWidgets").then((m) => m.PomodoroWidget),
    ),
    min: { w: 2, h: 2 },
    max: { w: 5, h: 3 },
    default: { w: 3, h: 2 },
    chrome: true,
  },
  stats: {
    kind: "stats",
    name: "Task stats",
    component: lazyProps(() => import("@/components/widgets/SmallWidgets").then((m) => m.StatsWidget)),
    min: { w: 2, h: 2 },
    max: { w: 5, h: 3 },
    default: { w: 3, h: 2 },
    chrome: true,
  },
  "quick-links": {
    kind: "quick-links",
    name: "Links",
    component: lazyProps(() =>
      import("@/components/widgets/SmallWidgets").then((m) => m.QuickLinksWidget),
    ),
    min: { w: 2, h: 2 },
    max: { w: 5, h: 6 },
    default: { w: 3, h: 3 },
    chrome: true,
  },
  soundpad: {
    kind: "soundpad",
    name: "Sounds",
    component: lazyProps(() =>
      import("@/components/soundboard/SoundBoard").then((m) => {
        const CompactBoard = () => <m.SoundBoard compact cols={3} />;
        return CompactBoard;
      }),
    ),
    min: { w: 2, h: 2 },
    max: { w: 6, h: 5 },
    default: { w: 3, h: 3 },
    chrome: true,
  },
  macros: {
    kind: "macros",
    name: "Macros",
    component: lazyProps(() =>
      import("@/components/reflect/MacroWidgets").then((m) => m.MacroRings),
    ),
    min: { w: 3, h: 2 },
    max: { w: 6, h: 3 },
    default: { w: 4, h: 2 },
    chrome: true,
  },
  meals: {
    kind: "meals",
    name: "Meals",
    component: lazyProps(() =>
      import("@/components/reflect/MacroWidgets").then((m) => m.MealLog),
    ),
    min: { w: 2, h: 2 },
    max: { w: 6, h: 6 },
    default: { w: 3, h: 3 },
    chrome: true,
  },
  skincare: {
    kind: "skincare",
    name: "Skincare",
    component: lazyProps(() =>
      import("@/components/reflect/SkincareWidget").then((m) => m.SkincareWidget),
    ),
    min: { w: 2, h: 2 },
    max: { w: 5, h: 4 },
    default: { w: 3, h: 2 },
    chrome: true,
  },
  "habit-heatmap": {
    kind: "habit-heatmap",
    name: "Consistency",
    component: lazyProps(() =>
      import("@/components/widgets/SmallWidgets").then((m) => m.HabitHeatmapWidget),
    ),
    min: { w: 2, h: 2 },
    max: { w: 5, h: 4 },
    default: { w: 3, h: 3 },
    chrome: true,
  },
  momentum: {
    kind: "momentum",
    name: "Momentum",
    component: lazyProps(() =>
      import("@/components/insights/InsightWidgets").then((m) => m.MomentumWidget),
    ),
    min: { w: 3, h: 2 },
    max: { w: 6, h: 3 },
    default: { w: 4, h: 2 },
    chrome: true,
  },
  "week-shape": {
    kind: "week-shape",
    name: "Week shape",
    component: lazyProps(() =>
      import("@/components/insights/InsightWidgets").then((m) => m.WeekShapeWidget),
    ),
    min: { w: 3, h: 2 },
    max: { w: 6, h: 3 },
    default: { w: 3, h: 2 },
    chrome: true,
  },
  balance: {
    kind: "balance",
    name: "Balance",
    component: lazyProps(() =>
      import("@/components/insights/InsightWidgets").then((m) => m.BalanceWidget),
    ),
    min: { w: 3, h: 2 },
    max: { w: 6, h: 3 },
    default: { w: 4, h: 3 },
    chrome: true,
  },
  training: {
    kind: "training",
    name: "Training",
    component: lazyProps(() =>
      import("@/components/insights/InsightWidgets").then((m) => m.TrainingWidget),
    ),
    min: { w: 3, h: 2 },
    max: { w: 6, h: 3 },
    default: { w: 4, h: 2 },
    chrome: true,
  },
};

export const WIDGET_LIST = Object.values(WIDGETS);
