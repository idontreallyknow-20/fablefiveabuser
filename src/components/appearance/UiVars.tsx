"use client";

// Applies the `ui` settings group to the document root: accent override,
// radius / density / contrast data attributes, and root font scale.
// Mounted once in providers.tsx.

import { useEffect } from "react";
import { useSettings } from "@/lib/settings/store";

const FONT_SIZE: Record<string, string> = {
  "0.9": "93.75%",
  "1.1": "106.25%",
};

/** #rrggbb -> rgba(r,g,b,0.13), the soft accent wash used across the app */
function softOf(hex: string): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.13)`;
}

export function UiVars() {
  const ui = useSettings((s) => s.settings.ui);

  useEffect(() => {
    const root = document.documentElement;
    const soft = ui.accent ? softOf(ui.accent) : null;
    if (ui.accent && soft) {
      root.style.setProperty("--accent", ui.accent);
      root.style.setProperty("--accent-soft", soft);
      root.style.setProperty("--accent-ink", "#14100a");
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-soft");
      root.style.removeProperty("--accent-ink");
    }
    root.dataset.radius = ui.radius;
    root.dataset.density = ui.density;
    root.dataset.contrast = ui.contrast;
    const size = FONT_SIZE[String(ui.fontScale)];
    if (size) root.style.fontSize = size;
    else root.style.removeProperty("font-size");
  }, [ui]);

  return null;
}
