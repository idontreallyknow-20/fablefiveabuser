// Starter layouts for the Today grid. Picking one replaces the current
// arrangement; from there everything is free-form.

import type { TodayLayout, WidgetInstance } from "@/lib/widgets/types";

let uid = 0;
const w = (
  kind: WidgetInstance["kind"],
  x: number,
  y: number,
  ww: number,
  h: number,
): WidgetInstance => ({ id: `p${uid++}-${kind}`, kind, x, y, w: ww, h });

export interface LayoutPresetDef {
  id: string;
  name: string;
  build: () => TodayLayout;
}

export const LAYOUT_PRESETS: LayoutPresetDef[] = [
  {
    // default: only widgets that work with zero integrations, no holes
    id: "command",
    name: "Command Center",
    build: () => ({
      widgets: [
        w("priorities", 0, 0, 7, 5),
        w("due-soon", 7, 0, 5, 3),
        w("stats", 7, 3, 5, 2),
        w("routines", 0, 5, 4, 3),
        w("habit-heatmap", 4, 5, 4, 3),
        w("momentum", 8, 5, 4, 3),
      ],
    }),
  },
  {
    id: "calm",
    name: "Calm",
    build: () => ({ widgets: [w("priorities", 2, 0, 8, 5)] }),
  },
  {
    id: "music",
    name: "Music",
    build: () => ({
      widgets: [w("player", 2, 0, 8, 3), w("priorities", 2, 3, 8, 4)],
    }),
  },
  {
    id: "planner",
    name: "Planner",
    build: () => ({
      widgets: [
        w("priorities", 0, 0, 6, 5),
        w("calendar-today", 6, 0, 6, 3),
        w("due-soon", 6, 3, 6, 3),
        w("stats", 0, 5, 3, 3),
        w("habit-heatmap", 3, 5, 3, 3),
      ],
    }),
  },
  {
    id: "desk",
    name: "Desk",
    build: () => ({
      widgets: [
        w("priorities", 0, 0, 7, 4),
        w("pomodoro", 7, 0, 3, 2),
        w("notes", 7, 2, 5, 4),
        w("quick-links", 10, 0, 2, 2),
        w("due-soon", 0, 4, 5, 3),
      ],
    }),
  },
];

export function presetById(id: string): LayoutPresetDef {
  return LAYOUT_PRESETS.find((p) => p.id === id) ?? LAYOUT_PRESETS[0];
}

/** maps the retired preset+hidden-widgets settings onto a starter grid */
export function migrateLegacyLayout(
  presetId: string,
  hidden: string[],
): TodayLayout {
  const legacyToPreset: Record<string, string> = {
    command: "command",
    calm: "calm",
    music: "music",
    project: "planner",
    calendar: "planner",
    mobile: "calm",
  };
  const layout = presetById(legacyToPreset[presetId] ?? "command").build();
  const hiddenKinds = new Set(
    hidden.map((h) => (h === "calendar" ? "calendar-today" : h)),
  );
  return { widgets: layout.widgets.filter((i) => !hiddenKinds.has(i.kind)) };
}
