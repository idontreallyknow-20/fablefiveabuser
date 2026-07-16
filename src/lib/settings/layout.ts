// Today layout presets: curated compositions, not a free-form grid.
// Each preset decides which widgets render and how the columns weigh.

export type WidgetKey = "player" | "calendar" | "routines" | "priorities";

export interface LayoutPresetDef {
  id: "command" | "calm" | "music" | "project" | "calendar" | "mobile";
  name: string;
  description: string;
  widgets: WidgetKey[];
  /** true = priorities column leads; false = side column leads */
  prioritiesFirst: boolean;
}

export const LAYOUT_PRESETS: LayoutPresetDef[] = [
  {
    id: "command",
    name: "Command Center",
    description: "Everything in view: priorities, music, calendar, routines",
    widgets: ["priorities", "player", "calendar", "routines"],
    prioritiesFirst: true,
  },
  {
    id: "calm",
    name: "Calm Today",
    description: "Just the clock and three priorities",
    widgets: ["priorities"],
    prioritiesFirst: true,
  },
  {
    id: "music",
    name: "Music and Atmosphere",
    description: "The scene, the clock, and the player",
    widgets: ["player"],
    prioritiesFirst: false,
  },
  {
    id: "project",
    name: "Project Focus",
    description: "Priorities and calendar, nothing else",
    widgets: ["priorities", "calendar"],
    prioritiesFirst: true,
  },
  {
    id: "calendar",
    name: "Calendar Focus",
    description: "The day's schedule leads",
    widgets: ["calendar", "priorities"],
    prioritiesFirst: false,
  },
  {
    id: "mobile",
    name: "Mobile Essentials",
    description: "A single quiet column for the phone",
    widgets: ["priorities", "player"],
    prioritiesFirst: true,
  },
];

export function presetById(id: string): LayoutPresetDef {
  return LAYOUT_PRESETS.find((p) => p.id === id) ?? LAYOUT_PRESETS[0];
}

export function visibleWidgets(presetId: string, hidden: string[]): Set<WidgetKey> {
  const preset = presetById(presetId);
  return new Set(preset.widgets.filter((w) => !hidden.includes(w)));
}
