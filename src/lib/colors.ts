// Shared color-coding palette: dusty, low-saturation hues that sit quietly
// on the dark hue-biased scenes without shouting over the theme accent.

export type PaletteColor = { id: string; hex: string };

export const PALETTE: PaletteColor[] = [
  { id: "coral", hex: "#d98a6b" },
  { id: "amber", hex: "#d9a06b" },
  { id: "gold", hex: "#cdb36e" },
  { id: "sage", hex: "#a4b884" },
  { id: "mint", hex: "#6fc7a8" },
  { id: "teal", hex: "#67b4bd" },
  { id: "periwinkle", hex: "#8ba0d8" },
  { id: "lavender", hex: "#a893d6" },
  { id: "rose", hex: "#d287a4" },
  { id: "slate", hex: "#8e9fb5" },
];

/** Deterministic, stable hash of a tag name onto the palette (FNV-1a). */
export function colorForTag(tag: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < tag.length; i++) {
    h ^= tag.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return PALETTE[(h >>> 0) % PALETTE.length].hex;
}

/** "#rrggbb" (or "#rgb") + alpha 0..1 -> "#rrggbbaa" */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${h.toLowerCase()}${a}`;
}
