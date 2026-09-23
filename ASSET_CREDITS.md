# Asset credits

Orbit's visual layer is almost entirely procedural: every atmospheric effect
(rain, glass droplets, fog, stars, shooting stars, snow, dust, caustics, city
lights, neon signs, embers, clouds, branches, moon, lamp glow) is original
canvas code written for this project, and the film grain is a procedural SVG
`feTurbulence` data URI. No third-party imagery, video, Lottie, or shader code
is bundled. Licensing research that led to this approach is recorded in
`docs/research/asset-sourcing.md` (date accessed: 2026-07-16).

## Built-in backgrounds

The six backdrop files in `public/backgrounds/` (dusk, dawn, deep-sea,
nebula, forest-mist, warm-lamp) are original, generated in-repo by
`scripts/generate-backgrounds.mjs` — procedural SVG gradients written for
this project, no third-party imagery. Effectively CC0/original work; no
attribution required.

## Fonts (bundled at build time via next/font)

| Asset | Purpose | Author | Source | License | Attribution required | Location | Modifications |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fraunces | Display serif (clock, titles) | Undercase Type (Phaedra Charles, Flavia Zimbardi) | https://fonts.google.com/specimen/Fraunces | SIL OFL 1.1 | No (license text must accompany font redistribution; next/font subsets at build) | Build-time via `next/font/google` | Subsetting only |
| Hanken Grotesk | Body text | Hanken Design Co. | https://fonts.google.com/specimen/Hanken+Grotesk | SIL OFL 1.1 | No | Build-time via `next/font/google` | Subsetting only |
| JetBrains Mono | Data, time metadata, eyebrows | JetBrains | https://fonts.google.com/specimen/JetBrains+Mono | SIL OFL 1.1 | No | Build-time via `next/font/google` | Subsetting only |

## Libraries (npm, license per package.json of each package)

| Package | Purpose | License |
| --- | --- | --- |
| next / react / react-dom | Framework | MIT |
| @anthropic-ai/sdk | Optional assistant | MIT |
| tailwindcss | Styling | MIT |
| @tanstack/react-query | Data fetching and cache | MIT |
| zustand | Client state | MIT |
| suncalc | Sunrise, sunset, moon phase | BSD-2-Clause |
| idb | IndexedDB wrapper (on-device storage) | ISC |

## Data services

| Service | Purpose | Terms |
| --- | --- | --- |
| Open-Meteo | Weather and geocoding | Free for non-commercial use, no key required, CC BY 4.0 data attribution: weather data by Open-Meteo.com |
| Google Fonts | Font delivery at build time | Fonts under SIL OFL 1.1 |

## Icons

All interface icons are original SVGs drawn for Orbit (see
`src/components/ui/Icons.tsx`). The PWA
icon is an original composition rendered from `scripts` at build.
