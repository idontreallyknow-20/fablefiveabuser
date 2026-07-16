// Theme registry: every theme owns its palette (globals.css), scene
// composition, effect set, and ambient-mode composition. Scenes are rendered
// by src/components/atmosphere; ids here must match [data-theme] blocks.

export type ThemeId =
  | "rainy-city"
  | "bedroom"
  | "library"
  | "tokyo"
  | "observatory"
  | "forest"
  | "snow"
  | "academia"
  | "ocean"
  | "luxe"
  | "living-sky";

export type MotionLevel = "low" | "balanced" | "cinematic";

export type EffectKind =
  | "rain"
  | "droplets"
  | "fog"
  | "stars"
  | "shooting-stars"
  | "snow"
  | "dust"
  | "caustics"
  | "city-lights"
  | "neon-signs"
  | "embers"
  | "clouds"
  | "branches"
  | "moon"
  | "lamp-glow"
  | "sky-gradient";

export interface SceneLayerConfig {
  effect: EffectKind;
  /** 0..1 intensity at the "balanced" motion level */
  intensity: number;
  /** parallax depth 0 (far) .. 1 (near glass) */
  depth: number;
  /** render only when real weather matches (see WeatherKind) */
  weather?: WeatherGate[];
  /** render only during these day phases */
  phases?: DayPhase[];
}

export type WeatherGate =
  | "rain"
  | "drizzle"
  | "snow"
  | "fog"
  | "clear"
  | "clouds"
  | "storm"
  | "any";

export type DayPhase =
  | "predawn"
  | "sunrise"
  | "morning"
  | "midday"
  | "golden"
  | "sunset"
  | "blue-hour"
  | "night";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  tagline: string;
  /** whether real weather modulates the scene */
  weatherReactive: boolean;
  /** whether astronomical time modulates the scene */
  timeReactive: boolean;
  /** base scene painted behind everything (canvas gradient spec) */
  sky: {
    top: string;
    mid: string;
    horizon: string;
  };
  layers: SceneLayerConfig[];
  /** ambient mode: which secondary element accompanies the clock */
  ambientFocus: "weather" | "music" | "sky" | "scene";
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  "rainy-city": {
    id: "rainy-city",
    name: "Rainy Midnight City",
    tagline: "A nighttime city through rain-covered glass",
    weatherReactive: true,
    timeReactive: true,
    sky: { top: "#05070d", mid: "#0a0f1b", horizon: "#131b2e" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "clouds", intensity: 0.5, depth: 0.1 },
      { effect: "city-lights", intensity: 0.85, depth: 0.25 },
      { effect: "fog", intensity: 0.35, depth: 0.45 },
      { effect: "rain", intensity: 0.7, depth: 0.8 },
      { effect: "droplets", intensity: 0.6, depth: 1 },
    ],
    ambientFocus: "weather",
  },
  bedroom: {
    id: "bedroom",
    name: "Late-Night Bedroom",
    tagline: "A calm room over the city, lamp on",
    weatherReactive: true,
    timeReactive: true,
    sky: { top: "#0d0a08", mid: "#151009", horizon: "#1d150c" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "city-lights", intensity: 0.5, depth: 0.2 },
      { effect: "rain", intensity: 0.45, depth: 0.5, weather: ["rain", "drizzle", "storm"] },
      { effect: "lamp-glow", intensity: 0.8, depth: 0.9 },
      { effect: "dust", intensity: 0.3, depth: 0.95 },
    ],
    ambientFocus: "music",
  },
  library: {
    id: "library",
    name: "Moonlit Library",
    tagline: "Paper, brass, and candlelight after hours",
    weatherReactive: false,
    timeReactive: true,
    sky: { top: "#0b0a0d", mid: "#121014", horizon: "#1a171c" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "moon", intensity: 0.6, depth: 0.15 },
      { effect: "dust", intensity: 0.55, depth: 0.7 },
      { effect: "embers", intensity: 0.35, depth: 0.9 },
    ],
    ambientFocus: "scene",
  },
  tokyo: {
    id: "tokyo",
    name: "Japanese Night Street",
    tagline: "Lantern light and wet asphalt",
    weatherReactive: true,
    timeReactive: false,
    sky: { top: "#07090f", mid: "#0d1017", horizon: "#161a24" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "neon-signs", intensity: 0.75, depth: 0.3 },
      { effect: "fog", intensity: 0.25, depth: 0.5 },
      { effect: "rain", intensity: 0.5, depth: 0.8, weather: ["rain", "drizzle", "storm"] },
    ],
    ambientFocus: "scene",
  },
  observatory: {
    id: "observatory",
    name: "Deep-Space Observatory",
    tagline: "The slow rotation of the sky",
    weatherReactive: false,
    timeReactive: true,
    sky: { top: "#020409", mid: "#05080f", horizon: "#0a0e1a" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "stars", intensity: 0.9, depth: 0.2 },
      { effect: "shooting-stars", intensity: 0.4, depth: 0.3 },
      { effect: "moon", intensity: 0.5, depth: 0.4 },
    ],
    ambientFocus: "sky",
  },
  forest: {
    id: "forest",
    name: "Foggy Forest",
    tagline: "Mist moving between dark pines",
    weatherReactive: true,
    timeReactive: true,
    sky: { top: "#070b08", mid: "#0b110d", horizon: "#111a13" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "branches", intensity: 0.6, depth: 0.35 },
      { effect: "fog", intensity: 0.8, depth: 0.6 },
      { effect: "dust", intensity: 0.25, depth: 0.9 },
    ],
    ambientFocus: "scene",
  },
  snow: {
    id: "snow",
    name: "Snowy Midnight",
    tagline: "Slow snowfall under sodium light",
    weatherReactive: true,
    timeReactive: true,
    sky: { top: "#090c13", mid: "#0e1220", horizon: "#161c2b" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "city-lights", intensity: 0.4, depth: 0.25 },
      { effect: "snow", intensity: 0.75, depth: 0.7 },
      { effect: "fog", intensity: 0.3, depth: 0.5 },
    ],
    ambientFocus: "weather",
  },
  academia: {
    id: "academia",
    name: "Dark Academia",
    tagline: "Ink, oak, and late reading",
    weatherReactive: true,
    timeReactive: false,
    sky: { top: "#0c0a08", mid: "#13100c", horizon: "#1a1610" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "rain", intensity: 0.35, depth: 0.5, weather: ["rain", "drizzle", "storm"] },
      { effect: "dust", intensity: 0.4, depth: 0.75 },
      { effect: "embers", intensity: 0.45, depth: 0.9 },
    ],
    ambientFocus: "scene",
  },
  ocean: {
    id: "ocean",
    name: "Deep Ocean",
    tagline: "Caustic light through dark water",
    weatherReactive: false,
    timeReactive: false,
    sky: { top: "#020a0a", mid: "#04100f", horizon: "#081817" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "caustics", intensity: 0.7, depth: 0.3 },
      { effect: "dust", intensity: 0.5, depth: 0.7 },
    ],
    ambientFocus: "scene",
  },
  luxe: {
    id: "luxe",
    name: "Minimal Black Luxury",
    tagline: "Nothing moves unless it must",
    weatherReactive: false,
    timeReactive: false,
    sky: { top: "#070708", mid: "#0a0a0b", horizon: "#0e0e10" },
    layers: [{ effect: "sky-gradient", intensity: 1, depth: 0 }],
    ambientFocus: "music",
  },
  "living-sky": {
    id: "living-sky",
    name: "Living Sky",
    tagline: "The actual sky over Richmond Hill",
    weatherReactive: true,
    timeReactive: true,
    sky: { top: "#0a0e16", mid: "#101624", horizon: "#1a2233" },
    layers: [
      { effect: "sky-gradient", intensity: 1, depth: 0 },
      { effect: "stars", intensity: 0.7, depth: 0.15, phases: ["night", "predawn", "blue-hour"] },
      { effect: "clouds", intensity: 0.6, depth: 0.3 },
      { effect: "moon", intensity: 0.5, depth: 0.35, phases: ["night", "predawn", "blue-hour"] },
      { effect: "rain", intensity: 0.6, depth: 0.7, weather: ["rain", "drizzle", "storm"] },
      { effect: "snow", intensity: 0.6, depth: 0.7, weather: ["snow"] },
      { effect: "fog", intensity: 0.5, depth: 0.5, weather: ["fog"] },
    ],
    ambientFocus: "sky",
  },
};

export const THEME_LIST = Object.values(THEMES);

export const DEFAULT_THEME: ThemeId = "rainy-city";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && v in THEMES;
}
