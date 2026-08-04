"use client";

// Generative lofi soundscape: chords + vinyl crackle + rain, all synthesized
// on the shared AudioContext. One singleton instance; Focus and Sounds both
// toggle the same soundscape. Like the Spotify player, it keeps playing when
// the tab is hidden — it is media, not UI chrome.
//
// The top half of this file is pure math (progression, scheduling, clamping)
// so it can be unit-tested without ever constructing an AudioContext.

import { audioContext, masterBus, noiseBuffer } from "@/lib/sound/engine";

export type LofiLayer = "chords" | "crackle" | "rain";

export const LOFI_LAYERS: LofiLayer[] = ["chords", "crackle", "rain"];

/* ------------------------------ pure parts ------------------------------ */

export const LOFI_BPM = 74;
export const BEATS_PER_CHORD = 4;

export interface LofiChord {
  name: string;
  /** midi note numbers, low to high (root first) */
  midi: number[];
}

// ii–V–I–vi in F major (Gm7 – C7 – Fmaj7 – Dm7), voiced close around
// middle C for a warm, mellow pad with smooth voice-leading.
export const LOFI_PROGRESSION: LofiChord[] = [
  { name: "Gm7", midi: [55, 58, 62, 65] }, // G3 Bb3 D4 F4
  { name: "C7", midi: [52, 58, 60, 67] }, // E3 Bb3 C4 G4
  { name: "Fmaj7", midi: [53, 57, 60, 64] }, // F3 A3 C4 E4
  { name: "Dm7", midi: [50, 57, 60, 65] }, // D3 A3 C4 F4
];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function secondsPerChord(bpm = LOFI_BPM, beats = BEATS_PER_CHORD): number {
  return (beats * 60) / bpm;
}

export function chordAt(step: number): LofiChord {
  const n = LOFI_PROGRESSION.length;
  return LOFI_PROGRESSION[((step % n) + n) % n];
}

export function chordFrequencies(chord: LofiChord): number[] {
  return chord.midi.map(midiToFreq);
}

/** absolute AudioContext time at which chord `step` starts */
export function chordStartTime(startTime: number, step: number, spc = secondsPerChord()): number {
  return startTime + step * spc;
}

export function clampGain(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/* ----------------------------- audio wiring ----------------------------- */

// per-layer loudness scale applied on top of the 0..1 user gain
const LAYER_SCALE: Record<LofiLayer, number> = { chords: 0.5, crackle: 0.4, rain: 0.4 };

const DEFAULT_GAINS: Record<LofiLayer, number> = { chords: 0.8, crackle: 0.5, rain: 0.25 };

const layerGains: Record<LofiLayer, number> = { ...DEFAULT_GAINS };

interface LofiInstance {
  layers: Record<LofiLayer, GainNode>;
  timer: ReturnType<typeof setInterval>;
  crackleTimer: { id: ReturnType<typeof setTimeout> | null; alive: boolean };
  oscillators: Set<OscillatorNode>;
  sources: AudioScheduledSourceNode[];
  detuneWobble: GainNode;
}

let instance: LofiInstance | null = null;

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function subscribeLofi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isLofiRunning(): boolean {
  return instance !== null;
}

export function getLofiLayer(layer: LofiLayer): number {
  return layerGains[layer];
}

export function setLofiLayer(layer: LofiLayer, gain: number) {
  layerGains[layer] = clampGain(gain);
  if (instance) {
    const ac = audioContext();
    const g = instance.layers[layer].gain;
    g.cancelScheduledValues(ac.currentTime);
    g.setTargetAtTime(layerGains[layer] * LAYER_SCALE[layer], ac.currentTime, 0.06);
  }
  notify();
}

function scheduleChordVoice(
  inst: LofiInstance,
  filter: BiquadFilterNode,
  t: number,
  step: number,
  dur: number,
) {
  const ac = audioContext();
  const chord = chordAt(step);
  const attack = 0.7;
  const release = 0.6;

  const voice = (freq: number, level: number, type: OscillatorType, detuneCents: number) => {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detuneCents;
    inst.detuneWobble.connect(osc.detune); // tape-style pitch wobble
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, t + dur - release);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    osc.connect(g);
    g.connect(filter);
    osc.start(t);
    osc.stop(t + dur + 0.3);
    inst.oscillators.add(osc);
    osc.onended = () => inst.oscillators.delete(osc);
  };

  // soft detuned triangle pad, two voices per note for warmth
  for (const midi of chord.midi) {
    const f = midiToFreq(midi);
    voice(f, 0.06, "triangle", 4);
    voice(f, 0.06, "triangle", -5);
  }
  // sub root, one octave down
  voice(midiToFreq(chord.midi[0] - 12), 0.1, "sine", 0);
}

function startCrackle(inst: LofiInstance, layer: GainNode) {
  const ac = audioContext();

  // faint continuous hiss bed
  const hiss = ac.createBufferSource();
  hiss.buffer = noiseBuffer("pink");
  hiss.loop = true;
  const hissFilter = ac.createBiquadFilter();
  hissFilter.type = "lowpass";
  hissFilter.frequency.value = 3200;
  const hissGain = ac.createGain();
  hissGain.gain.value = 0.04;
  hiss.connect(hissFilter);
  hissFilter.connect(hissGain);
  hissGain.connect(layer);
  hiss.start();
  inst.sources.push(hiss);

  // sparse random pops: short bandpassed noise blips
  const pop = () => {
    if (!inst.crackleTimer.alive) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer("white");
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900 + Math.random() * 3200;
    bp.Q.value = 10;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.5, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + Math.random() * 0.04);
    src.connect(bp);
    bp.connect(g);
    g.connect(layer);
    src.start(t, Math.random());
    src.stop(t + 0.09);
    inst.crackleTimer.id = setTimeout(pop, 120 + Math.random() * 900);
  };
  pop();
}

export function startLofi(opts?: Partial<Record<LofiLayer, number>>) {
  if (instance) return;
  if (opts) for (const k of LOFI_LAYERS) if (opts[k] !== undefined) layerGains[k] = clampGain(opts[k]!);

  const ac = audioContext();

  const layers = {} as Record<LofiLayer, GainNode>;
  for (const k of LOFI_LAYERS) {
    const g = ac.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(layerGains[k] * LAYER_SCALE[k], ac.currentTime, 0.3);
    g.connect(masterBus());
    layers[k] = g;
  }

  const inst: LofiInstance = {
    layers,
    timer: 0 as unknown as ReturnType<typeof setInterval>,
    crackleTimer: { id: null, alive: true },
    oscillators: new Set(),
    sources: [],
    detuneWobble: ac.createGain(),
  };

  // chord layer: shared warm lowpass, wobbled by a slow LFO (filter + detune)
  const chordFilter = ac.createBiquadFilter();
  chordFilter.type = "lowpass";
  chordFilter.frequency.value = 950;
  chordFilter.Q.value = 0.7;
  chordFilter.connect(layers.chords);

  const lfo = ac.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.3;
  const filterWobble = ac.createGain();
  filterWobble.gain.value = 140; // Hz swing on the cutoff
  lfo.connect(filterWobble);
  filterWobble.connect(chordFilter.frequency);
  inst.detuneWobble.gain.value = 3.5; // cents of tape drift
  lfo.connect(inst.detuneWobble);
  lfo.start();
  inst.sources.push(lfo);

  // rain layer: reuse the shared pink-noise buffer, gently lowpassed
  const rain = ac.createBufferSource();
  rain.buffer = noiseBuffer("pink");
  rain.loop = true;
  const rainFilter = ac.createBiquadFilter();
  rainFilter.type = "lowpass";
  rainFilter.frequency.value = 1400;
  const rainWobble = ac.createGain();
  rainWobble.gain.value = 240;
  lfo.connect(rainWobble);
  rainWobble.connect(rainFilter.frequency);
  rain.connect(rainFilter);
  rainFilter.connect(layers.rain);
  rain.start();
  inst.sources.push(rain);

  startCrackle(inst, layers.crackle);

  // lookahead scheduler: tick every 200ms, schedule chords 600ms ahead
  const spc = secondsPerChord();
  let step = 0;
  let nextTime = ac.currentTime + 0.15;
  const tick = () => {
    while (nextTime < ac.currentTime + 0.6) {
      // if the tab was throttled and we fell behind, restart from "now"
      if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
      scheduleChordVoice(inst, chordFilter, nextTime, step, spc);
      step += 1;
      nextTime += spc;
    }
  };
  tick();
  inst.timer = setInterval(tick, 200);

  instance = inst;
  notify();
}

export function stopLofi() {
  const inst = instance;
  if (!inst) return;
  instance = null;
  const ac = audioContext();
  clearInterval(inst.timer);
  inst.crackleTimer.alive = false;
  if (inst.crackleTimer.id !== null) clearTimeout(inst.crackleTimer.id);

  const t = ac.currentTime;
  for (const k of LOFI_LAYERS) {
    const g = inst.layers[k].gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(0.0001, t + 0.3);
  }
  setTimeout(() => {
    for (const osc of inst.oscillators) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    inst.oscillators.clear();
    for (const src of inst.sources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    for (const k of LOFI_LAYERS) inst.layers[k].disconnect();
    inst.detuneWobble.disconnect();
  }, 400);
  notify();
}
