"use client";

// Pure-WebAudio synth presets: every pad sound is generated, no assets.
// Params are plain JSON so pads serialize to the database.

import { audioContext, masterBus, noiseBuffer, type Voice } from "@/lib/sound/engine";

export interface SynthParams {
  preset: SynthPresetId;
  /** playback pitch multiplier for tonal presets */
  pitch?: number;
  /** seconds, for one-shots */
  decay?: number;
  /** lowpass cutoff Hz for noise presets */
  filter?: number;
}

export type SynthPresetId =
  | "rain"
  | "brown-noise"
  | "white-noise"
  | "fire"
  | "wind"
  | "chime"
  | "bell"
  | "click"
  | "key"
  | "om";

export interface SynthPresetDef {
  id: SynthPresetId;
  name: string;
  loop: boolean;
  defaults: SynthParams;
}

export const SYNTH_PRESETS: SynthPresetDef[] = [
  { id: "rain", name: "Rain", loop: true, defaults: { preset: "rain", filter: 1400 } },
  { id: "brown-noise", name: "Deep noise", loop: true, defaults: { preset: "brown-noise", filter: 500 } },
  { id: "white-noise", name: "Static", loop: true, defaults: { preset: "white-noise", filter: 4000 } },
  { id: "fire", name: "Fire", loop: true, defaults: { preset: "fire", filter: 900 } },
  { id: "wind", name: "Wind", loop: true, defaults: { preset: "wind", filter: 600 } },
  { id: "chime", name: "Chime", loop: false, defaults: { preset: "chime", pitch: 1, decay: 2.4 } },
  { id: "bell", name: "Bell", loop: false, defaults: { preset: "bell", pitch: 1, decay: 3 } },
  { id: "click", name: "Click", loop: false, defaults: { preset: "click", decay: 0.06 } },
  { id: "key", name: "Key", loop: false, defaults: { preset: "key", pitch: 1, decay: 0.14 } },
  { id: "om", name: "Om", loop: true, defaults: { preset: "om", pitch: 1 } },
];

export function parseSynthParams(v: unknown): SynthParams | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r.preset !== "string") return null;
  if (!SYNTH_PRESETS.some((p) => p.id === r.preset)) return null;
  return {
    preset: r.preset as SynthPresetId,
    pitch: typeof r.pitch === "number" ? r.pitch : undefined,
    decay: typeof r.decay === "number" ? r.decay : undefined,
    filter: typeof r.filter === "number" ? r.filter : undefined,
  };
}

function envGain(at: number, peak: number, decay: number): GainNode {
  const ac = audioContext();
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  return g;
}

function noiseLoop(
  kind: "white" | "pink" | "brown",
  filterHz: number,
  gain: number,
  wobble?: { rate: number; depth: number },
): Voice {
  const ac = audioContext();
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(kind);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz;
  const g = ac.createGain();
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.4);
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  if (wobble) {
    lfo = ac.createOscillator();
    lfo.frequency.value = wobble.rate;
    lfoGain = ac.createGain();
    lfoGain.gain.value = wobble.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
  }
  src.connect(filter);
  filter.connect(g);
  g.connect(masterBus());
  src.start();
  return {
    stop: () => {
      const t = ac.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      setTimeout(() => {
        src.stop();
        lfo?.stop();
      }, 400);
    },
  };
}

function partials(
  freqs: number[],
  gains: number[],
  decay: number,
  gain: number,
): Voice {
  const ac = audioContext();
  const t = ac.currentTime;
  const nodes: OscillatorNode[] = [];
  for (let i = 0; i < freqs.length; i++) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freqs[i];
    const g = envGain(t, gain * gains[i], decay * (1 - i * 0.12));
    osc.connect(g);
    g.connect(masterBus());
    osc.start(t);
    osc.stop(t + decay + 0.1);
    nodes.push(osc);
  }
  return { stop: () => nodes.forEach((n) => n.stop()) };
}

/** fire: brown bed + random crackle bursts */
function fireVoice(filterHz: number, gain: number): Voice {
  const bed = noiseLoop("brown", filterHz, gain * 0.7);
  const ac = audioContext();
  let alive = true;
  const crackle = () => {
    if (!alive) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer("white");
    src.loop = false;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 + Math.random() * 2600;
    bp.Q.value = 8;
    const g = envGain(t, gain * (0.15 + Math.random() * 0.3), 0.05 + Math.random() * 0.08);
    src.connect(bp);
    bp.connect(g);
    g.connect(masterBus());
    src.start(t, Math.random());
    src.stop(t + 0.2);
    setTimeout(crackle, 60 + Math.random() * 340);
  };
  crackle();
  return {
    stop: () => {
      alive = false;
      bed.stop();
    },
  };
}

export function playSynth(params: SynthParams, gain = 0.8): Voice {
  const p = params;
  const pitch = p.pitch ?? 1;
  switch (p.preset) {
    case "rain":
      return noiseLoop("pink", p.filter ?? 1400, gain * 0.5, { rate: 0.18, depth: 240 });
    case "brown-noise":
      return noiseLoop("brown", p.filter ?? 500, gain * 0.75);
    case "white-noise":
      return noiseLoop("white", p.filter ?? 4000, gain * 0.32);
    case "wind":
      return noiseLoop("pink", p.filter ?? 600, gain * 0.55, { rate: 0.07, depth: 380 });
    case "fire":
      return fireVoice(p.filter ?? 900, gain);
    case "chime":
      return partials(
        [880 * pitch, 1320 * pitch, 1760 * pitch, 2640 * pitch],
        [0.5, 0.3, 0.22, 0.1],
        p.decay ?? 2.4,
        gain,
      );
    case "bell":
      return partials(
        [440 * pitch, 587 * pitch, 880 * pitch, 1174 * pitch, 1760 * pitch],
        [0.55, 0.28, 0.26, 0.14, 0.08],
        p.decay ?? 3,
        gain,
      );
    case "click": {
      const ac = audioContext();
      const t = ac.currentTime;
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer("white");
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 2400;
      const g = envGain(t, gain * 0.6, p.decay ?? 0.06);
      src.connect(hp);
      hp.connect(g);
      g.connect(masterBus());
      src.start(t, Math.random());
      src.stop(t + 0.15);
      return { stop: () => src.stop() };
    }
    case "key":
      return partials([1200 * pitch, 2100 * pitch], [0.4, 0.14], p.decay ?? 0.14, gain);
    case "om": {
      const ac = audioContext();
      const t = ac.currentTime;
      const oscs: OscillatorNode[] = [];
      const g = ac.createGain();
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(gain * 0.4, t + 1.2);
      for (const [f, amt] of [
        [110 * pitch, 0.6],
        [220 * pitch, 0.25],
        [330 * pitch, 0.1],
      ] as const) {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const og = ac.createGain();
        og.gain.value = amt;
        osc.connect(og);
        og.connect(g);
        osc.start();
        oscs.push(osc);
      }
      g.connect(masterBus());
      return {
        stop: () => {
          const now = ac.currentTime;
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
          setTimeout(() => oscs.forEach((o) => o.stop()), 900);
        },
      };
    }
  }
}
