// Built-in backdrop pack: original SVG gradients generated in-repo by
// scripts/generate-backgrounds.mjs (see ASSET_CREDITS.md). Served statically
// from public/backgrounds — no upload or signed URL involved.

export interface BuiltinBackground {
  /** settings.background.id value, always `builtin:` prefixed */
  id: string;
  name: string;
  /** static path under public/ */
  path: string;
  /** placeholder painted while the file streams in */
  avgColor: string;
}

export const BUILTIN_PREFIX = "builtin:";

export const BUILTIN_BACKGROUNDS: BuiltinBackground[] = [
  { id: "builtin:dusk", name: "Dusk", path: "/backgrounds/dusk.svg", avgColor: "#191627" },
  { id: "builtin:dawn", name: "Dawn", path: "/backgrounds/dawn.svg", avgColor: "#1d1a20" },
  { id: "builtin:deep-sea", name: "Deep Sea", path: "/backgrounds/deep-sea.svg", avgColor: "#06201f" },
  { id: "builtin:nebula", name: "Nebula", path: "/backgrounds/nebula.svg", avgColor: "#150f22" },
  { id: "builtin:forest-mist", name: "Forest Mist", path: "/backgrounds/forest-mist.svg", avgColor: "#101a13" },
  { id: "builtin:warm-lamp", name: "Warm Lamp", path: "/backgrounds/warm-lamp.svg", avgColor: "#1c130a" },
];

export function isBuiltinBackgroundId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(BUILTIN_PREFIX);
}

export function getBuiltinBackground(id: string | null | undefined): BuiltinBackground | null {
  if (!id) return null;
  return BUILTIN_BACKGROUNDS.find((b) => b.id === id) ?? null;
}
