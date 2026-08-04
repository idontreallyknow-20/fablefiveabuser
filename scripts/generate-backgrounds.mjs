// Generates Orbit's built-in backdrop pack: six original, hand-tuned SVG
// gradient scenes written to public/backgrounds/. Pure text output — no
// native canvas dependency. Run: node scripts/generate-backgrounds.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "backgrounds");
const W = 1920;
const H = 1080;

/**
 * @param {string} id
 * @param {{stops: [number, string][], glows: {cx:number,cy:number,r:number,color:string,opacity:number}[], vignette?: number}} spec
 */
function svg(id, spec) {
  const stops = spec.stops
    .map(([off, c]) => `<stop offset="${off}%" stop-color="${c}"/>`)
    .join("");
  const glowDefs = spec.glows
    .map(
      (g, i) =>
        `<radialGradient id="${id}-g${i}" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0%" stop-color="${g.color}" stop-opacity="${g.opacity}"/>` +
        `<stop offset="100%" stop-color="${g.color}" stop-opacity="0"/>` +
        `</radialGradient>`,
    )
    .join("");
  const glowShapes = spec.glows
    .map(
      (g, i) =>
        `<circle cx="${Math.round(g.cx * W)}" cy="${Math.round(g.cy * H)}" r="${Math.round(g.r * H)}" fill="url(#${id}-g${i})"/>`,
    )
    .join("");
  const vig = spec.vignette ?? 0.35;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>` +
    glowDefs +
    `<radialGradient id="${id}-vig" cx="50%" cy="46%" r="72%">` +
    `<stop offset="55%" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="#000" stop-opacity="${vig}"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>` +
    glowShapes +
    `<rect width="${W}" height="${H}" fill="url(#${id}-vig)"/>` +
    `</svg>\n`
  );
}

const PACK = {
  dusk: {
    stops: [
      [0, "#0b0a1a"],
      [45, "#1c1533"],
      [78, "#3b2244"],
      [100, "#54303f"],
    ],
    glows: [
      { cx: 0.5, cy: 1.05, r: 0.75, color: "#c96a4e", opacity: 0.28 },
      { cx: 0.22, cy: 0.2, r: 0.5, color: "#2c2a5e", opacity: 0.3 },
    ],
  },
  dawn: {
    stops: [
      [0, "#0e1420"],
      [50, "#22222f"],
      [80, "#43303a"],
      [100, "#6b4547"],
    ],
    glows: [
      { cx: 0.62, cy: 1.08, r: 0.8, color: "#d99a72", opacity: 0.24 },
      { cx: 0.3, cy: 0.12, r: 0.55, color: "#1b2b45", opacity: 0.35 },
    ],
  },
  "deep-sea": {
    stops: [
      [0, "#02090c"],
      [42, "#04181c"],
      [78, "#0a2c2e"],
      [100, "#10403c"],
    ],
    glows: [
      { cx: 0.5, cy: 0.02, r: 0.85, color: "#2b7a72", opacity: 0.18 },
      { cx: 0.78, cy: 0.55, r: 0.45, color: "#12454a", opacity: 0.28 },
    ],
    vignette: 0.45,
  },
  nebula: {
    stops: [
      [0, "#070512"],
      [50, "#120c26"],
      [100, "#1e1030"],
    ],
    glows: [
      { cx: 0.32, cy: 0.38, r: 0.55, color: "#5b2d8f", opacity: 0.3 },
      { cx: 0.7, cy: 0.62, r: 0.5, color: "#2d4a8f", opacity: 0.26 },
      { cx: 0.55, cy: 0.3, r: 0.28, color: "#a4547e", opacity: 0.2 },
    ],
  },
  "forest-mist": {
    stops: [
      [0, "#0a120c"],
      [48, "#122017"],
      [80, "#1f3324"],
      [100, "#314730"],
    ],
    glows: [
      { cx: 0.5, cy: 0.78, r: 0.75, color: "#8aa88f", opacity: 0.16 },
      { cx: 0.2, cy: 0.5, r: 0.5, color: "#4a6a52", opacity: 0.18 },
    ],
    vignette: 0.4,
  },
  "warm-lamp": {
    stops: [
      [0, "#0b0806"],
      [55, "#171008"],
      [100, "#241609"],
    ],
    glows: [
      { cx: 0.72, cy: 0.34, r: 0.6, color: "#e09a4a", opacity: 0.26 },
      { cx: 0.72, cy: 0.34, r: 0.25, color: "#f6c780", opacity: 0.22 },
    ],
    vignette: 0.5,
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, spec] of Object.entries(PACK)) {
  const file = join(OUT, `${name}.svg`);
  writeFileSync(file, svg(name, spec));
  console.log(`wrote ${file}`);
}
