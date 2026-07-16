# Orbit — art direction brief

Orbit is a digital environment first and a tracker second. It should feel like
the view from a warm room late at night: quiet, expensive, personal. Every
design decision below was derived from live research (see `docs/research/`)
and is binding for all screens and themes.

## Thesis

The interface is a pane of glass between the user and a living scene. The
scene (rain, city lights, sky, fog) lives *behind* the glass and reacts to
real weather and real astronomical time in Richmond Hill. Content sits on the
glass plane: static, calm, readable. Atmosphere never runs over text.

The signature element is the **clock lockup**: an oversized Fraunces
tabular-figure clock with a monospace metadata line beneath it (date, weather,
next event). It anchors Today, Focus, and Ambient across every theme, and it
is the one element allowed to be huge.

## Type system

- **Display: Fraunces** (OFL). Clock, page titles, big numbers. Weight 300 to
  560, optical size high, `font-variant-numeric: tabular-nums` for time.
- **Body: Hanken Grotesk** (OFL). All interface text. Weights 400 to 600 only;
  never lighter than 400 on dark ground.
- **Data: JetBrains Mono** (OFL). Section eyebrows (11px, uppercase,
  0.14em tracking), timestamps, weather values, analytics, keyboard hints.

Scale: 11 eyebrow / 13 caption / 15 body / 17 lead / 22 h3 / 28 h2 / 40 h1 /
clock from 72 to 176 fluid. Line-height 1.5 body, 1.1 display.

## Color rules

- Every theme's canvas is a **hue-biased off-black**, never `#000`, never a
  neutral gray. Rainy Midnight City is blue-biased; Late-Night Bedroom is
  warm brown-biased.
- One rationed accent per theme. Accents mark *now, next, and active* — never
  decoration. Secondary hues may only appear inside the scene layer.
- Surface ladder instead of shadows: 4 steps (canvas, panel, raised, overlay)
  separated by ~4% lightness and a 1px hairline at 8-12% alpha.
- Text: warm off-white at 100/70/45% opacity steps. Body contrast targets
  APCA Lc 75+; captions Lc 60+. No pure white (halation).
- Semantic: success = each theme's accent, error = desaturated brick
  `#C4574E` family adjusted per theme. No third-party brand colors except
  inside official Spotify attribution.

## Surface + depth

- Panels are matte by default. Translucency/blur is reserved for the two
  floating layers (mini player, command overlay) — never applied to every card.
- Procedural grain overlay (SVG feTurbulence, 2.5% opacity, `overlay` blend)
  sits between scene and content; it unifies gradients and kills banding.
- Depth comes from the scene (parallax layers, DOF blur inside the canvas),
  not from drop shadows. Cards get at most `0 1px 0 rgba(255,255,255,.03)
  inset` and the hairline.

## Motion tokens

- `--dur-fast: 140ms` press feedback; `--dur-base: 220ms` hover/toggles;
  `--dur-slow: 320ms` panels/modals; `--dur-scene: 1200ms` theme/weather
  cross-fades; ambient drift 20s+.
- Easing: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` for everything
  user-triggered; `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` for scene
  transitions. No bounce, no springs on layout.
- Entry: 12px rise + fade, 40ms stagger, once per navigation. Numbers
  cross-fade; they never roll or bounce.
- `prefers-reduced-motion`: scenes render a static composition, all interface
  transitions drop to opacity-only.

## Buttons

Variants: primary (filled accent-tinted surface), secondary (hairline),
quiet (text), destructive (brick), icon, segmented, toggle, media (round,
larger hit area), floating (blurred glass, the only translucent buttons).
Every variant has rest / hover (surface step up) / pressed (scale 0.98 +
step down) / focus-visible (2px offset ring in accent) / loading (inline
spinner replaces label, width preserved) / disabled (45% opacity, no events)
/ success and error feedback (brief label swap, then revert).
Hit areas ≥ 44px on touch. Focus rings never removed.

## Theme distribution

Each of the 11 themes owns: palette, scene composition, effect set, button
tint, icon accent, ambient composition. Effects are exclusive where they
carry meaning: rain lives in Rainy Midnight City (and weather-driven
variants), stars in Deep-Space Observatory, snow in Snowy Midnight, caustics
in Deep Ocean, fog in Foggy Forest, paper dust in Moonlit Library, neon
reflections in Japanese Night Street. Weather reactivity is strongest in the
two flagships and Living Sky; Minimal Black Luxury ignores weather by design.

## Layout rules

- Desktop: 12-col grid, max content 1560px on ultrawide with scene bleeding
  full width. Left rail navigation (72px collapsed, 220px expanded).
- Mobile: single column, bottom tab bar (Today / Projects / Train / Reflect /
  Space), clock lockup compressed but never removed.
- Density: comfortable = 8px base spacing unit; compact = 6px.
- Empty space is composition. Today shows at most: clock lockup, weather,
  next event, three priorities, player. Nothing else without user intent.

## What is banned

Emojis in UI. Em dashes in copy. Neon cyberpunk gradients. Floating blobs.
Glassmorphism on every card. Giant marketing headers. Fake data anywhere.
Identical recolored themes. Random glow. Pill-shaped everything. Purple-on-
black defaults. Equal-weight card grids. Animate-everything page loads.
