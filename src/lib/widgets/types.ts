// Free-form Today grid: widget instances snapped to a 12-column grid.

export type WidgetKind =
  | "priorities"
  | "player"
  | "calendar-today"
  | "routines"
  | "due-soon"
  | "weather-week"
  | "notes"
  | "countdown"
  | "pomodoro"
  | "stats"
  | "quick-links"
  | "habit-heatmap";

export interface WidgetInstance {
  id: string;
  kind: WidgetKind;
  /** column 0..11 */
  x: number;
  /** row, unbounded */
  y: number;
  /** column span 1..12 */
  w: number;
  /** row span */
  h: number;
  /** per-instance configuration (note text, countdown target, links...) */
  props?: Record<string, unknown>;
}

export interface TodayLayout {
  widgets: WidgetInstance[];
}

export const GRID_COLS = 12;

export function clampInstance(
  inst: WidgetInstance,
  min: { w: number; h: number },
  max: { w: number; h: number },
): WidgetInstance {
  const w = Math.max(min.w, Math.min(max.w, inst.w));
  const h = Math.max(min.h, Math.min(max.h, inst.h));
  const x = Math.max(0, Math.min(GRID_COLS - w, inst.x));
  const y = Math.max(0, inst.y);
  return { ...inst, x, y, w, h };
}

/**
 * Vertical compaction with push-down: keeps x/w, resolves overlaps by
 * shifting later widgets down, then pulls everything as far up as free
 * space allows. Deterministic given input order by (y, x).
 */
export function compact(widgets: WidgetInstance[]): WidgetInstance[] {
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: WidgetInstance[] = [];
  const overlapsX = (a: WidgetInstance, b: WidgetInstance) =>
    a.x < b.x + b.w && b.x < a.x + a.w;
  for (const inst of sorted) {
    let y = 0;
    // lowest y where this instance doesn't overlap anything already placed
    for (;;) {
      const hit = placed.find(
        (p) => overlapsX(p, inst) && y < p.y + p.h && p.y < y + inst.h,
      );
      if (!hit) break;
      y = hit.y + hit.h;
    }
    placed.push({ ...inst, y });
  }
  return placed;
}
