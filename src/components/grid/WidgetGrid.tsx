"use client";

// Hand-rolled 12-column snap grid. Render is plain CSS grid; edit mode
// adds pointer-driven move/resize with cell snapping and push-down
// compaction. Mobile renders a single column ordered by (y, x) with
// reorder controls instead of free placement.

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  clampInstance,
  compact,
  GRID_COLS,
  type TodayLayout,
  type WidgetInstance,
} from "@/lib/widgets/types";
import { WIDGETS } from "@/lib/widgets/registry";

const ROW_PX = 92;
const GAP_PX = 12;

/** true at the md breakpoint and above; false during SSR */
function useDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false,
  );
}

interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: WidgetInstance;
  /** live cell-space preview */
  preview: WidgetInstance;
}

export function WidgetGrid({
  layout,
  editing,
  onChange,
}: {
  layout: TodayLayout;
  editing: boolean;
  onChange: (next: TodayLayout) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const desktop = useDesktop();

  const widgets = useMemo(
    () => compact(layout.widgets.filter((i) => WIDGETS[i.kind])),
    [layout.widgets],
  );

  const cellWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 100;
    return (el.clientWidth - GAP_PX * (GRID_COLS - 1)) / GRID_COLS;
  }, []);

  const applyDrag = useCallback(
    (state: DragState, clientX: number, clientY: number): DragState => {
      const cw = cellWidth();
      const dxCells = Math.round((clientX - state.startX) / (cw + GAP_PX));
      const dyCells = Math.round((clientY - state.startY) / (ROW_PX + GAP_PX));
      const def = WIDGETS[state.origin.kind];
      const next =
        state.mode === "move"
          ? { ...state.origin, x: state.origin.x + dxCells, y: state.origin.y + dyCells }
          : {
              ...state.origin,
              w: state.origin.w + dxCells,
              h: state.origin.h + dyCells,
            };
      return { ...state, preview: clampInstance(next, def.min, def.max) };
    },
    [cellWidth],
  );

  const startDrag = (inst: WidgetInstance, mode: "move" | "resize") => (e: React.PointerEvent) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id: inst.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: inst,
      preview: inst,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag((d) => (d ? applyDrag(d, e.clientX, e.clientY) : d));
  };

  const endDrag = () => {
    if (!drag) return;
    const next = widgets.map((i) => (i.id === drag.id ? drag.preview : i));
    onChange({ widgets: compact(next) });
    setDrag(null);
  };

  const rendered = useMemo(() => {
    if (!drag) return widgets;
    // live preview: substitute the dragged widget and re-compact
    return compact(widgets.map((i) => (i.id === drag.id ? drag.preview : i)));
  }, [widgets, drag]);

  const rows = rendered.reduce((m, i) => Math.max(m, i.y + i.h), 1);

  const updateProps = (id: string) => (patch: Record<string, unknown>) => {
    onChange({
      widgets: layout.widgets.map((i) =>
        i.id === id ? { ...i, props: { ...(i.props ?? {}), ...patch } } : i,
      ),
    });
  };

  const remove = (id: string) => {
    onChange({ widgets: layout.widgets.filter((i) => i.id !== id) });
  };

  const move = (id: string, dir: -1 | 1) => {
    // mobile reorder: swap with the neighbor in (y, x) order
    const order = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
    const idx = order.findIndex((i) => i.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j], order[idx]];
    onChange({
      widgets: compact(order.map((i, k) => ({ ...i, y: k, x: 0 }))).map((i) => {
        const orig = widgets.find((o) => o.id === i.id)!;
        return { ...i, x: orig.x, w: orig.w, h: orig.h };
      }),
    });
  };

  if (!desktop) {
    return (
      <div className="flex flex-col gap-3">
        {[...widgets]
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .map((inst, idx, arr) => {
            const def = WIDGETS[inst.kind];
            const Comp = def.component;
            return (
              <div
                key={inst.id}
                data-widget={inst.kind}
                className={`relative ${def.chrome ? "surface rounded-2xl p-4" : ""}`}
              >
                <Comp props={inst.props ?? {}} onProps={updateProps(inst.id)} editing={editing} />
                {editing && (
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-bg2/90 p-0.5">
                    <button
                      aria-label={`Move ${def.name} up`}
                      disabled={idx === 0}
                      onClick={() => move(inst.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      aria-label={`Move ${def.name} down`}
                      disabled={idx === arr.length - 1}
                      onClick={() => move(inst.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M8 3v10M3.5 8.5L8 13l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      aria-label={`Remove ${def.name}`}
                      onClick={() => remove(inst.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:text-ink"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            gridAutoRows: `${ROW_PX}px`,
            minHeight: rows * (ROW_PX + GAP_PX),
          }}
        >
          {rendered.map((inst) => {
            const def = WIDGETS[inst.kind];
            const Comp = def.component;
            const isDragging = drag?.id === inst.id;
            return (
              <div
                key={inst.id}
                data-widget={inst.kind}
                className={`relative min-h-0 ${def.chrome ? "surface rounded-2xl p-4" : ""} ${
                  editing ? "select-none" : ""
                } ${isDragging ? "z-30 opacity-90 ring-2 ring-(--accent)/50" : ""} ${
                  editing && !isDragging ? "transition-all duration-200" : ""
                }`}
                style={{
                  gridColumn: `${inst.x + 1} / span ${inst.w}`,
                  gridRow: `${inst.y + 1} / span ${inst.h}`,
                }}
              >
                <div className={`h-full min-h-0 ${editing ? "pointer-events-none" : ""}`}>
                  <Comp props={inst.props ?? {}} onProps={updateProps(inst.id)} editing={editing} />
                </div>
                {editing && (
                  <div
                    className="absolute inset-0 z-10 cursor-grab rounded-2xl border border-dashed border-(--accent)/40 active:cursor-grabbing"
                    onPointerDown={startDrag(inst, "move")}
                  >
                    <span className="absolute left-2 top-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      {def.name}
                    </span>
                    <button
                      aria-label={`Remove ${def.name}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => remove(inst.id)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-bg2/80 text-ink-faint transition-colors hover:text-ink"
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    <span
                      role="button"
                      aria-label={`Resize ${def.name}`}
                      onPointerDown={startDrag(inst, "resize")}
                      className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize rounded-sm border-b-2 border-r-2 border-(--accent)/60"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
  );
}
