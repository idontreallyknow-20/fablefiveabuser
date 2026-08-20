"use client";

// The soundboard: pads play synth presets or uploaded samples. Loops
// toggle; one-shots retrigger. Hotkeys 1-9 fire pads on the full board.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCreatePad,
  useDeletePad,
  usePads,
  type SoundPad,
} from "@/lib/data/soundboard";
import { parseSynthParams, playSynth, SYNTH_PRESETS } from "@/lib/sound/synth";
import { loadSample, playSample, uploadSample } from "@/lib/sound/samples";
import type { Voice } from "@/lib/sound/engine";
import { LofiPad } from "@/components/soundboard/LofiPad";
import { IconPlus } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";

const PAD_COLORS = ["#d9a05b", "#5f9ea8", "#7d8ec4", "#c4574e", "#8aa87a", "#b3736f"];

function Pad({
  pad,
  active,
  onPress,
  editing,
  onRemove,
  index,
  showHotkey,
}: {
  pad: SoundPad;
  active: boolean;
  onPress: () => void;
  editing: boolean;
  onRemove: () => void;
  index: number;
  showHotkey: boolean;
}) {
  const color = pad.color || PAD_COLORS[index % PAD_COLORS.length];
  return (
    <div className="relative">
      <button
        onClick={onPress}
        aria-pressed={pad.loop ? active : undefined}
        aria-label={`Pad ${pad.label || index + 1}`}
        className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border transition-all duration-[var(--dur-fast)] active:scale-[0.97] ${
          active
            ? "border-transparent shadow-[inset_0_0_0_2px_var(--pad-color)]"
            : "border-line hover:border-line-strong"
        }`}
        style={{ "--pad-color": color, backgroundColor: active ? `${color}14` : undefined } as React.CSSProperties}
      >
        <span
          className={`h-2 w-2 rounded-full transition-opacity ${active ? "animate-pulse" : "opacity-40"}`}
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className={`max-w-full truncate px-2 text-[12px] ${active ? "text-ink" : "text-ink-dim"}`}>
          {pad.label || SYNTH_PRESETS.find((p) => p.id === parseSynthParams(pad.params)?.preset)?.name || "Pad"}
        </span>
        {showHotkey && index < 9 && (
          <span className="tnum font-mono text-[10px] text-ink-faint">{index + 1}</span>
        )}
      </button>
      {editing && (
        <button
          aria-label={`Remove pad ${pad.label || index + 1}`}
          onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg2 text-ink-faint transition-colors hover:text-ink"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function SoundBoard({
  compact = false,
  cols = 4,
}: {
  compact?: boolean;
  cols?: number;
}) {
  const { data: pads = [] } = usePads();
  const createPad = useCreatePad();
  const deletePad = useDeletePad();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState(false);
  const voices = useRef(new Map<string, Voice>());
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set);
  const fileInput = useRef<HTMLInputElement>(null);

  const stopVoice = useCallback((id: string) => {
    voices.current.get(id)?.stop();
    voices.current.delete(id);
    setActiveIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }, []);

  const press = useCallback(
    async (pad: SoundPad) => {
      // loops toggle; one-shots retrigger
      if (pad.loop && voices.current.has(pad.id)) {
        stopVoice(pad.id);
        return;
      }
      try {
        let voice: Voice;
        if (pad.kind === "sample" && pad.sample_path) {
          const buffer = await loadSample(pad.sample_path);
          voice = playSample(buffer, Number(pad.gain) || 0.8, pad.loop);
        } else {
          const params = parseSynthParams(pad.params);
          if (!params) return;
          voice = playSynth(params, Number(pad.gain) || 0.8);
        }
        if (pad.loop) {
          voices.current.set(pad.id, voice);
          setActiveIds((s) => new Set(s).add(pad.id));
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : "Could not play");
      }
    },
    [stopVoice, toast],
  );

  // hotkeys 1..9 on the full board
  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const pad = pads[n - 1];
      if (pad) void press(pad);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pads, press, compact]);

  // stop everything on unmount
  useEffect(() => {
    const map = voices.current;
    return () => {
      for (const v of map.values()) v.stop();
      map.clear();
    };
  }, []);

  const addSynth = async (presetId: string) => {
    const preset = SYNTH_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    await createPad.mutateAsync({
      slot: pads.length,
      label: preset.name,
      kind: "synth",
      params: preset.defaults as unknown as SoundPad["params"],
      loop: preset.loop,
    });
    setPicker(false);
  };

  const addSampleFile = async (file: File) => {
    try {
      const path = await uploadSample(file);
      await createPad.mutateAsync({
        slot: pads.length,
        label: file.name.replace(/\.\w+$/, "").slice(0, 24),
        kind: "sample",
        sample_path: path,
        loop: false,
      });
      setPicker(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="eyebrow">Sounds</h2>
        {!compact && (
          <button
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={`rounded-lg px-2 py-0.5 text-[12px] transition-colors ${
              editing ? "text-accent" : "text-ink-faint hover:text-ink"
            }`}
          >
            Edit
          </button>
        )}
      </div>

      <div
        className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {!compact && <LofiPad />}
        {pads.map((pad, i) => (
          <Pad
            key={pad.id}
            pad={pad}
            index={i}
            active={activeIds.has(pad.id)}
            editing={editing}
            showHotkey={!compact}
            onPress={() => void press(pad)}
            onRemove={() => {
              stopVoice(pad.id);
              void deletePad.mutateAsync(pad.id);
            }}
          />
        ))}
        {(!compact || pads.length === 0) && (
          <button
            onClick={() => setPicker((v) => !v)}
            aria-expanded={picker}
            aria-label="Add pad"
            className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-line text-ink-faint transition-colors hover:border-(--accent)/50 hover:text-ink"
          >
            <IconPlus size={16} />
          </button>
        )}
      </div>

      {picker && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SYNTH_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => void addSynth(p.id)}
              className="h-8 rounded-lg border border-line bg-bg1 px-2.5 text-[12px] text-ink-dim transition-colors hover:border-(--accent)/50 hover:text-ink"
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => fileInput.current?.click()}
            className="h-8 rounded-lg border border-line bg-bg1 px-2.5 font-mono text-[11.5px] text-ink-dim transition-colors hover:border-(--accent)/50 hover:text-ink"
          >
            Upload
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="audio/*"
            className="hidden"
            aria-label="Upload sample"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void addSampleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
