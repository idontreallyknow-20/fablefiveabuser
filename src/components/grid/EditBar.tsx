"use client";

// Edit-mode controls for the Today grid: enter/exit, add widgets,
// apply a starter layout.

import { useState } from "react";
import { compact, type TodayLayout, type WidgetInstance } from "@/lib/widgets/types";
import { WIDGET_LIST, WIDGETS } from "@/lib/widgets/registry";
import { LAYOUT_PRESETS } from "@/lib/settings/layout";
import { Button } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/Icons";

export function EditBar({
  editing,
  layout,
  onEditing,
  onChange,
}: {
  editing: boolean;
  layout: TodayLayout;
  onEditing: (v: boolean) => void;
  onChange: (next: TodayLayout) => void;
}) {
  const [sheet, setSheet] = useState<"add" | "presets" | null>(null);

  const add = (kind: WidgetInstance["kind"]) => {
    const def = WIDGETS[kind];
    const maxY = layout.widgets.reduce((m, i) => Math.max(m, i.y + i.h), 0);
    const inst: WidgetInstance = {
      id: crypto.randomUUID(),
      kind,
      x: 0,
      y: maxY,
      w: def.default.w,
      h: def.default.h,
    };
    onChange({ widgets: compact([...layout.widgets, inst]) });
    setSheet(null);
  };

  if (!editing) {
    return (
      <Button variant="quiet" size="sm" onClick={() => onEditing(true)}>
        Edit layout
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sheet === "add" && (
        <div className="flex flex-wrap items-center gap-1.5">
          {WIDGET_LIST.map((def) => (
            <button
              key={def.kind}
              onClick={() => add(def.kind)}
              className="h-8 rounded-lg border border-line bg-bg1 px-2.5 text-[12.5px] text-ink-dim transition-colors hover:border-(--accent)/50 hover:text-ink"
            >
              {def.name}
            </button>
          ))}
        </div>
      )}
      {sheet === "presets" && (
        <div className="flex flex-wrap items-center gap-1.5">
          {LAYOUT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p.build());
                setSheet(null);
              }}
              className="h-8 rounded-lg border border-line bg-bg1 px-2.5 text-[12.5px] text-ink-dim transition-colors hover:border-(--accent)/50 hover:text-ink"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setSheet(sheet === "add" ? null : "add")}
        aria-expanded={sheet === "add"}
      >
        <IconPlus size={14} />
        Widget
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setSheet(sheet === "presets" ? null : "presets")}
        aria-expanded={sheet === "presets"}
      >
        Presets
      </Button>
      <Button variant="primary" size="sm" onClick={() => { setSheet(null); onEditing(false); }}>
        Done
      </Button>
    </div>
  );
}
