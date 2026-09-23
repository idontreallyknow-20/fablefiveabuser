"use client";

import { useState } from "react";
import { useLofiRunning } from "@/components/soundboard/LofiPad";
import {
  getLofiLayer,
  setLofiLayer,
  startLofi,
  stopLofi,
  type LofiLayer,
} from "@/lib/sound/lofi";

const LOFI_SLIDERS: { layer: LofiLayer; label: string }[] = [
  { layer: "chords", label: "Chords" },
  { layer: "crackle", label: "Crackle" },
  { layer: "rain", label: "Rain" },
];

/** start/stop the generative lofi bed, with per-layer mix when running */
export function LofiControl() {
  const running = useLofiRunning();
  const [gains, setGains] = useState<Record<LofiLayer, number>>(() => ({
    chords: getLofiLayer("chords"),
    crackle: getLofiLayer("crackle"),
    rain: getLofiLayer("rain"),
  }));
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => (running ? stopLofi() : startLofi())}
        aria-pressed={running}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors ${
          running
            ? "border-(--accent)/60 bg-accent-soft text-accent"
            : "border-line bg-bg1/70 text-ink-dim hover:border-line-strong hover:text-ink"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full bg-current ${running ? "animate-pulse" : "opacity-50"}`}
          aria-hidden
        />
        Lofi
      </button>
      {running && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {LOFI_SLIDERS.map(({ layer, label }) => (
            <label key={layer} className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                {label}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={gains[layer]}
                aria-label={label}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setGains((g) => ({ ...g, [layer]: v }));
                  setLofiLayer(layer, v);
                }}
                className="h-1 w-16 cursor-pointer accent-(--accent)"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
