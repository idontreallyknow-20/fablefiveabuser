"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock } from "@/components/today/Clock";
import { WeatherChip } from "@/components/today/WeatherChip";
import { nextItemOf, useTodayAgenda } from "@/components/calendar/TodayEvents";
import { IconAmbient, IconFocus } from "@/components/ui/Icons";
import { useSettings } from "@/lib/settings/store";
import { presetById } from "@/lib/settings/layout";
import { WidgetGrid } from "@/components/grid/WidgetGrid";
import { EditBar } from "@/components/grid/EditBar";
import type { TodayLayout } from "@/lib/widgets/types";

function NextEventMeta() {
  const { items } = useTodayAgenda();
  const next = nextItemOf(items.filter((i) => i.kind === "task"));
  if (!next?.time) return null;
  return (
    <span className="tnum inline-flex items-center gap-1.5">
      <span aria-hidden className="text-ink-faint">·</span>
      <span>
        {next.time} {next.title}
      </span>
    </span>
  );
}

export default function TodayPage() {
  const todayLayout = useSettings((s) => s.settings.todayLayout);
  const set = useSettings((s) => s.set);
  const [editing, setEditing] = useState(false);

  const layout: TodayLayout = todayLayout ?? presetById("command").build();
  const onChange = (next: TodayLayout) => set({ todayLayout: next });

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <h1 className="sr-only">Today</h1>
      <header className="rise mb-8 mt-[4vh] flex flex-wrap items-end justify-between gap-6 md:mt-[5vh]">
        <Clock
          size="hero"
          meta={
            <>
              <span aria-hidden className="text-ink-faint">·</span>
              <WeatherChip />
              <NextEventMeta />
            </>
          }
        />
        <div className="flex items-center gap-2 pb-2">
          <EditBar
            editing={editing}
            layout={layout}
            onEditing={setEditing}
            onChange={onChange}
          />
          {!editing && (
            <>
              <Link
                href="/focus"
                className="flex h-10 items-center gap-2 rounded-xl border border-line bg-bg1/70 px-4 text-sm font-medium text-ink-dim transition-colors duration-[var(--dur-base)] hover:border-line-strong hover:text-ink"
              >
                <IconFocus size={16} />
                Focus
              </Link>
              <Link
                href="/ambient"
                aria-label="Ambient mode"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg1/70 text-ink-dim transition-colors duration-[var(--dur-base)] hover:border-line-strong hover:text-ink"
              >
                <IconAmbient size={16} />
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="rise flex-1" style={{ "--stagger-i": 2 } as React.CSSProperties}>
        <WidgetGrid layout={layout} editing={editing} onChange={onChange} />
      </div>
    </div>
  );
}
