"use client";

// Dense, searchable settings index: every registered setting renders
// generically here. Deep pages (Appearance, Connections...) still own
// their richer surfaces.

import { useMemo, useState } from "react";
import { useSettings } from "@/lib/settings/store";
import {
  getPath,
  searchSettings,
  setPath,
  type SettingDef,
} from "@/lib/settings/registry";
import { Segmented, Toggle } from "@/components/ui/Segmented";

function SettingRow({ def }: { def: SettingDef }) {
  const { settings, set } = useSettings();
  const value = getPath(settings, def.path);

  const apply = (v: unknown) => set(setPath(settings, def.path, v));

  return (
    <div className="flex min-h-11 items-center justify-between gap-6 border-b border-line/50 py-1.5 last:border-b-0">
      <span className="text-[13.5px] text-ink">{def.label}</span>
      {def.control.kind === "toggle" && (
        <Toggle label="" checked={Boolean(value)} onChange={apply} />
      )}
      {def.control.kind === "segmented" && (
        <Segmented
          label={def.label}
          size="sm"
          value={String(value)}
          onChange={apply}
          options={def.control.options}
        />
      )}
      {def.control.kind === "slider" && (
        <span className="flex items-center gap-3">
          <input
            type="range"
            min={def.control.min}
            max={def.control.max}
            step={def.control.step}
            value={Number(value) || 0}
            onChange={(e) => apply(Number(e.target.value))}
            className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-bg3 accent-(--accent)"
            aria-label={def.label}
          />
          <span className="tnum w-10 text-right font-mono text-[11.5px] text-ink-faint">
            {def.control.format ? def.control.format(Number(value) || 0) : String(value)}
          </span>
        </span>
      )}
      {def.control.kind === "number" && (
        <input
          type="number"
          min={def.control.min}
          max={def.control.max}
          step={def.control.step}
          value={Number(value) || 0}
          onChange={(e) => apply(Number(e.target.value))}
          aria-label={def.label}
          className="tnum h-8 w-20 rounded-lg border border-line bg-bg1 px-2 text-right font-mono text-[12.5px] text-ink focus:outline-none"
        />
      )}
    </div>
  );
}

export default function SpaceIndexPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchSettings(query), [query]);

  const sections = useMemo(() => {
    const map = new Map<string, SettingDef[]>();
    for (const def of results) {
      const list = map.get(def.section);
      if (list) list.push(def);
      else map.set(def.section, [def]);
    }
    return [...map.entries()];
  }, [results]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-8">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search settings"
        placeholder="Search"
        autoFocus
        className="h-11 rounded-xl border border-line bg-bg1 px-4 text-[14px] text-ink placeholder:text-ink-faint transition-colors duration-[var(--dur-base)] hover:border-line-strong focus:border-(--accent)/50 focus:outline-none"
      />
      {sections.map(([section, defs]) => (
        <section key={section} aria-label={section} className="surface rounded-2xl px-4 py-3">
          <h2 className="eyebrow mb-1">{section}</h2>
          {defs.map((def) => (
            <SettingRow key={def.id} def={def} />
          ))}
        </section>
      ))}
    </div>
  );
}
