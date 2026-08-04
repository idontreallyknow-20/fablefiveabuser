"use client";

// Soundboard audio engine: one lazy AudioContext behind a master gain and
// a limiter, so pads can layer without clipping. Created on first gesture.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function audioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function masterBus(): GainNode {
  audioContext();
  return master!;
}

export function setMasterVolume(v: number) {
  masterBus().gain.value = Math.max(0, Math.min(1, v));
}

export interface Voice {
  stop: () => void;
}

/** noise buffer factory, cached per color */
const noiseCache = new Map<string, AudioBuffer>();

export function noiseBuffer(kind: "white" | "pink" | "brown"): AudioBuffer {
  const ac = audioContext();
  const cached = noiseCache.get(kind);
  if (cached) return cached;
  const seconds = 2;
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const data = buf.getChannelData(0);
  if (kind === "white") {
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } else if (kind === "pink") {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + 0.029591 * w;
      b1 = 0.985 * b1 + 0.032534 * w;
      b2 = 0.95 * b2 + 0.048056 * w;
      data[i] = (b0 + b1 + b2 + w * 0.05) * 2.1;
    }
  } else {
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  noiseCache.set(kind, buf);
  return buf;
}
