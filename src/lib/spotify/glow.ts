"use client";

import { create } from "zustand";

/**
 * Album-art glow: the Spotify player extracts a muted average color from the
 * current artwork and publishes it here; the atmosphere blends it in subtly.
 */
interface GlowState {
  color: string | null;
  setColor: (c: string | null) => void;
}

export const useGlowStore = create<GlowState>((set) => ({
  color: null,
  setColor: (color) => set({ color }),
}));

export function usePlaybackGlow(enabled: boolean): string | null {
  const color = useGlowStore((s) => s.color);
  return enabled ? color : null;
}

/** average + desaturate artwork color; runs on an offscreen canvas */
export async function extractMutedColor(imageUrl: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = imageUrl;
    });
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 16, 16);
    const { data } = ctx.getImageData(0, 0, 16, 16);
    let r = 0,
      g = 0,
      b = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r /= n;
    g /= n;
    b /= n;
    // desaturate toward luma so the glow stays cinematic, never neon
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const mix = (v: number) => Math.round(v * 0.55 + luma * 0.45);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  } catch {
    return null;
  }
}
