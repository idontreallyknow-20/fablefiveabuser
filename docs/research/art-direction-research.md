# Orbit — Art Direction Research
### Live visual research for an atmospheric, dark, cinematic personal dashboard
Researched 2026-07-16 via live web search. All references cited with URLs. Mood targets: rainy-city midnight, late-night bedroom; premium, calm, editorial.

---

## 1. Award-winning dark / cinematic web interfaces (2025–2026)

### References

1. **Lando Norris official site (OFF+BRAND)** — Awwwards Site of the Year 2025 candidate coverage. Dark base, one loud accent (lime), cinematic scroll-driven sequences, 3D object staging.
   - https://www.awwwards.com/websites/sites_of_the_year/ and https://www.awwwards.com/websites/2025/
2. **Awwwards "Dark Themed" & "Dark Mode" collections** — the canonical curated pool of dark SOTD winners.
   - https://www.awwwards.com/inspiration/dark-themed-website · https://www.awwwards.com/awwwards/collections/dark-mode/
3. **Godly (godly.website)** — curated feed of 1,000+ experimental/dark portfolio-grade sites; filter by "Portfolios" for museum-dark case studies (e.g., Isabel Moranta's SOTD portfolio, where projects "emerge from darkness like artwork on gallery walls").
   - https://godly.website/?preset=Portfolios
4. **Obys Agency / Resn** — repeatedly cited 2025 dark-editorial standouts: pure-black stage, elegant transitions, type-led drama.
   - https://reallygooddesigns.com/dark-mode-websites/ · https://www.darkmodedesign.com/
5. **Siteinspire editorial category** — best-in-class editorial layouts to steal structure (not skin) from.
   - https://www.siteinspire.com/websites/category/editorial

### What makes them feel expensive
- **Color relationships:** near-black (not #000) canvas + paper-white type + exactly ONE saturated accent. Saturated accents "pop far better on dark" and dark-first is now a full brand identity for luxury/tech (https://www.figma.com/resource-library/web-design-trends/, https://fireart.studio/blog/the-best-web-design-trends/). Restraint = expense; the accent is rationed like a signature.
- **Typography pairings:** 2026 trend reporting converges on "elegant neo-serif headings + monospace utility fonts for metadata/dates/buttons" — typography as the primary interface architecture (https://enter.converge.ai/blog/web-design-trends, https://www.fontfabric.com/blog/10-design-trends-shaping-the-visual-typographic-landscape-in-2026/).
- **Spacing:** museum spacing — one hero element per viewport, huge negative space, content revealed sequentially rather than gridded densely.
- **Depth:** built with lighter surface steps and hairline 1px borders, not drop shadows; darkness is treated as substrate, geometry does the work (https://getdesign.md/linear.app/design-md via search summary).
- **Grain/texture:** subtle CSS/SVG noise or film grain over solid darks "breaks up digital perfection," reads as printed/cinematic material, and is deliberately cheap to render vs. WebGL ("Tactile Brutalism": film grain, CRT scanlines, single-pixel borders) (https://fireart.studio/blog/the-best-web-design-trends/, https://spoko.space/blog/modern-website-design-trends/). Grain is also explicitly framed as a reaction against sterile AI-generated flatness.

### What NOT to copy
- Lando Norris's lime + racing identity, Obys's project artwork, any studio's logotype or case-study photography.
- Awwwards-style heavy WebGL preloaders and scroll-jacking — wrong for a glanceable dashboard.
- Pure #000 backgrounds ("hole effect"); winners use off-blacks (https://bscwebdesign.at/en/blog/5-modern-alternatives-to-black-in-web-design-2025-tips-for-color-combinations/).

---

## 2. Rainy nighttime city + wet-glass treatments

### References

1. **Codrops "Rain & Water Effect Experiments"** — the canonical rain-on-glass WebGL study: refraction flips the background inside each drop; drops modeled as sliding lenses with micro-drops and trailing streaks, composited on GPU.
   - https://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/
2. **raindrop-fx (SardineFish)** — optimized WebGL2 raindrop-on-glass library (npm-installable), realistic refraction at good performance.
   - https://github.com/SardineFish/raindrop-fx
3. **Amado — open-source WebGL rain ambient reader** — "the browser equivalent of reading beside a rain-streaked window"; proof that rain works as *ambient background to content*, not just demo.
   - https://github.com/Oililyuk/amado
4. **websemantics rain-on-window demo** + Three.js shader walkthrough — lighter-weight canvas approaches.
   - https://websemantics.uk/articles/rain/ · https://dev.to/nordicbeaver/making-rain-animation-with-webgl-shaders-in-threejs-4ic5
5. **RainyMood / LofiSpace / RainyCafe** — the mood benchmark for "rainy ambience as product": layered, user-mixable atmosphere (rain 45% + music 60% + murmur 25% formula), scene variants (Classic/Ocean/Café).
   - https://rainymood.com/ · https://www.focusworkspace.app/rain-sounds · https://rainycafe.com/

### What's effective
- The convincing part of wet glass is **refraction + bokeh**, not drop count: a blurred, bokeh'd city-light background behind sharp lens-like drops. Blur the scene, keep the glass artifacts crisp.
- Rain reads best as a **background layer behind a dark translucent content plane** (Amado pattern) — the UI sits "inside the room," rain stays "outside the window."
- Ambience products (RainyMood) win through **variation and randomization** (400+ unique samples) — visual equivalent: drops must not loop visibly.
- Liquid-glass caution: Grafit Agency's reality-check argues full liquid-glass/refraction UI chrome is costly and gimmicky on the web — use it for atmosphere, not for controls (https://www.grafit.agency/blog/why-you-shouldnt-use-the-liquid-glass-effect-on-your-website-yet).

### What NOT to copy
- Don't put rain **over** text/controls; drops distorting UI copy kills legibility.
- Don't copy RainyMood's branding/scene photography or lofi-girl illustration style (heavily copyrighted, and visually cliché by 2026).
- Full-viewport heavy WebGL that competes with the dashboard's job; Codrops-style demos are showpieces, not chrome.

---

## 3. Spotify design language + third-party player patterns

### References

1. **Spotify Encore design system** — tiered system: Foundation (color, type, motion, spacing tokens) → local systems; coherence over uniformity.
   - https://spotify.design/article/reimagining-design-systems-at-spotify · https://www.figma.com/blog/creating-coherence-how-spotifys-design-system-goes-beyond-platforms/
2. **Spotify dynamic backdrops / Now Playing** — gradients generated by extracting a palette from album art; text/buttons auto-adjust for contrast; subtle gradient scrim behind controls.
   - https://medium.com/@shanmugashree3/how-spotify-creates-those-stunning-backdrops-that-match-every-song-playlist-00fe13eab033 · https://artists.spotify.com/canvas
3. **spotify-view (pkubiak)** — minimal open-source "artwork + gradient background" visualization; the distilled pattern.
   - https://github.com/pkubiak/spotify-view
4. **Dribbble "album-cover-color-responsive player"** — the third-party pattern of tinting the whole player from artwork.
   - https://dribbble.com/shots/13947189-Album-Cover-Color-Responsive-Music-player-UI

### What's effective
- **Album art is the hero and the light source**: large, sharp artwork; extracted-color gradient (darkened/desaturated toward the dashboard's base) bleeds into the surrounding surface so every track re-lights the module.
- **Contrast automation**: Spotify recomputes text/control colors per-artwork — any extraction scheme needs a floor (clamp lightness/saturation, verify contrast).
- **Scrims**: a subtle gradient overlay behind transport controls keeps them readable over art/canvas video.
- **Controls hierarchy**: one oversized primary (play/pause), secondary controls quiet; thin progress bar that grows on hover with a scrubber handle appearing only on interaction.
- Third-party patterns worth keeping: blurred-artwork backdrop at low opacity, pulsing/eq motion strictly tied to playback state, tabular time digits so timestamps don't jitter.

### What NOT to copy
- Spotify green (#1DB954), the Spotify logotype/circular brand font, or the exact Now Playing layout — instantly reads as a clone and is trademarked territory.
- Canvas-style looping video per track (licensing + noise).
- Don't reproduce album artwork you don't have rights to in marketing/screenshots; in-product rendering of the user's own streamed art is the pattern, not shipped assets.

---

## 4. Premium weather apps + weather-reactive ambient environments

### References

1. **CARROT Weather** — 2025 "glassy redesign," fully customizable layouts, line-chart hourly/daily forecasts; consistently the critics' premium pick.
   - https://www.meetcarrot.com/weather/ · https://www.tomsguide.com/round-up/best-weather-apps
2. **Hello Weather** — the glanceability benchmark: "clean, concise, glanceable," widget-first, subtle theme customization that never fights readability.
   - https://www.tomsguide.com/round-up/best-weather-apps
3. **Windy** — animated global map, 20+ layers, color-coded intensity fields; data-as-atmosphere.
   - https://www.windy.com/
4. **Ventusky** — flow-line wind visualization; color scales chosen to match the *feeling* the weather evokes (blue = cool, dark red = desert heat); "understand rain and storms without technical knowledge."
   - https://www.ventusky.com/ · https://www.ventusky.com/about

### What's effective
- **Condition-reactive environment**: the premium move is the whole surface (background gradient, particle layer, light temperature) shifting with weather + time of day, while the data layer stays fixed and legible.
- **Emotional color mapping** (Ventusky): pick hues by how the condition *feels*, not by meteorological convention.
- **One glance, one hierarchy** (Hello Weather): current temp + condition dominant; everything else is secondary rows. Customization exists but defaults are opinionated.
- **Continuous motion at low amplitude** (Windy): fields drift slowly and never demand attention — the model for ambient dashboard motion.

### What NOT to copy
- CARROT's snarky personality/voice (its trademark) and its data-dense customization maximalism.
- Apple Weather's exact animated condition scenes (heavily protected, and everyone clones them — instant genericism).
- Map-first layouts; Orbit needs condition-first, not geography-first.

---

## 5. Calm dashboard hierarchy in premium productivity apps

### References

1. **Linear — "How we redesigned the Linear UI (part II)" + "A calmer interface for a product in motion"** — the definitive public writeups: not every element carries equal weight; navigation recedes (dimmer sidebar), content area takes precedence; compact tabs; visual alignment over decoration.
   - https://linear.app/now/how-we-redesigned-the-linear-ui · https://linear.app/now/behind-the-latest-design-refresh
2. **Linear design-system teardowns** — near-black surface ladder (canvas → surface-1…4) carrying hierarchy *without shadows*; nearly monochrome + one accent; hairline borders; weights confined to a narrow 400–510 band.
   - https://getdesign.md/linear.app/design-md · https://github.com/voltagent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md
3. **Notion Calendar (ex-Cron)** — "most thoughtfully designed calendar app": minimal chrome, no unnecessary buttons, keyboard-first speed as a design feature.
   - https://efficient.app/apps/notion-calendar · https://www.eleken.co/blog-posts/cron-app-evaluation-by-ui-ux-designers
4. **Things (Cultured Code)** — long-standing Apple Design Award benchmark for whitespace-driven task hierarchy: headings + generous padding instead of boxes and dividers.
   - https://culturedcode.com/things/
5. **LogRocket on "Linear design" as a genre** — why the style spread, and why it becomes boring when copied wholesale.
   - https://blog.logrocket.com/ux-design/linear-design/

### What's effective
- **Recede/foreground logic**: chrome (nav, meta, labels) is dimmed 2–3 steps; only the current focus is at full contrast.
- **Surface ladder instead of shadows**: 4–5 background lightness steps; each container is one step lighter than its parent. Depth without glow.
- **Low weight-range typography**: contrast via size + color steps, not bold-vs-regular shouting.
- **Density through alignment, calm through subtraction**: strict column grid, hairline dividers only where grouping fails, empty space is allowed to exist.
- **Speed as calm**: instant, keyboard-reachable interactions read as "premium calm" as much as visuals do (Notion Calendar).

### What NOT to copy
- Linear's exact acid-lime accent + purple gradient marketing look (the most-cloned aesthetic of 2024–26; LogRocket literally calls the genre "boring" when copied).
- Issue-tracker density; Orbit is ambient, so density should be far lower than Linear's.
- Things' iOS-native visual language (SF-based, light-first) — take the hierarchy logic, not the skin.

---

## 6. Editorial typography on dark backgrounds

### References

1. **Pangram Pangram "Best Font Pairings 2025"** — high-contrast serif + pragmatic sans tension as the current editorial formula.
   - https://pangrampangram.com/blogs/journal/best-font-pairings-2025
2. **Fontfabric typography trends 2026** — neo-serif display + mono metadata; type as primary architecture.
   - https://www.fontfabric.com/blog/10-design-trends-shaping-the-visual-typographic-landscape-in-2026/
3. **APCA documentation + 2026 engineering guides** — perceptual contrast for dark mode: WCAG 4.5:1 breaks down on dark; bright-on-dark that "passes" can still cause halation.
   - https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html · https://humbldesign.io/blog-posts/color-accessibility-guide-wcag · https://apcacontrast.com/
4. **Google-font pairing roundups 2025–26** (for implementable candidates).
   - https://medium.com/design-bootcamp/best-google-font-pairings-for-ui-design-in-2025-ba8d006aa03d · https://www.landingpageflow.com/post/google-font-pairings-for-websites

### What's effective
- Current high-end dark-editorial formula: **high-contrast or neo-serif display** (Playfair-class, or softer "warm" serifs like Fraunces/Newsreader-class) for a few big moments + **quiet grotesque sans** for UI/body + **mono for data**, dates, and labels.
- **Dark-mode text rules** (APCA-informed): body ≈ Lc 75–90 target; avoid pure white on near-black — use off-white (~#EDEDF0) to prevent halation; slightly *increase* letter-spacing and reduce weight of large light-on-dark type (light text appears bolder on dark); never use thin weights below ~16px on dark.
- Off-black backgrounds, never #000 — softer, more elegant, avoids the hole effect (https://bscwebdesign.at/en/blog/5-modern-alternatives-to-black-in-web-design-2025-tips-for-color-combinations/).
- Hierarchy on dark via **opacity/color steps** (e.g., 100% / 70% / 45% white) rather than many font sizes.

### What NOT to copy
- Playfair Display specifically — the single most default "elegant" Google serif; it now signals template.
- Licensed foundry faces from reference sites (PP Editorial New, Söhne, GT Alpina et al.) — pick Google-Fonts analogues instead.
- Fashion-editorial ultra-thin hairline serifs at small sizes on dark — accessibility failure.

---

## 7. Atmospheric game menus + ambient display modes

### References

1. **Game UI Database** — 1,300+ games / 55,000 screenshots, filterable by color/material/layout; Death Stranding and Cyberpunk 2077 entries are the relevant dark-atmosphere studies.
   - https://www.gameuidatabase.com/ · https://gameuidatabase.com/gameData.php?id=371
2. **Death Stranding UI analyses** — functional futurism: soft blue monochrome scheme, minimal animation, long thin information lines, condensed sans (SST Paneuropean Condensed) + mono for numbers; the "strand" motif of the world repeated in the menu.
   - https://interfaceingame.com/games/death-stranding · https://fontsinuse.com/uses/67648/death-stranding-video-game · https://www.nevaehli.com/uiux-analysis/death-stranding
3. **Apple TV Aerial / Portraits screensavers** — slow-motion cinematic scenes + a single stylized clock overlay; the reference for "content becomes ambient centerpiece."
   - https://support.apple.com/guide/tv/set-up-screen-savers-atvbfa799b87/tvos · https://aerialscreensaver.github.io/
4. **Clocks.app (StandBy mode)** — phone/tablet as bedside ambient clock; drag-and-drop zones, glanceable at distance.
   - https://www.clocks.app/

### Composition rules extracted
- **UI echoes environment**: menu colors/textures derive from the world's atmosphere (https://www.justinmind.com/ui-design/game) — for Orbit: UI tint derives from the weather/scene, one hue family per scene.
- **Living background + static text plane**: the scene moves (slow, loopable, off-center focal point); the menu column is anchored, usually lower-left or lower-third, never centered over the focal point.
- **One motif, repeated**: Death Stranding's strand-line selection state — a single signature element (for Orbit: e.g., a thin "orbit" arc) used for selection/progress everywhere.
- **Ambient mode = subtraction**: Apple's screensaver formula is scene + clock + nothing; typography enlarges, chrome disappears, data reduced to 2–3 items readable across a room.
- Slow motion is literal: Aerials run at slow-motion pace; nothing in an ambient mode should complete a movement in under several seconds.

### What NOT to copy
- Kojima Productions' strand iconography, SST (licensed Sony face), Cyberpunk's glitch-yellow brand kit.
- Apple's Aerial footage (licensed) and the exact StandBy layout.
- Game-menu ambient audio autoplay — never autoplay sound on the web.

---

## 8. Motion language of premium interfaces

### References

1. **Emil Kowalski — "Great Animations" / animations.dev** (Design Engineer at Linear, ex-Vercel) — the current community-canonical text.
   - https://emilkowal.ski/ui/great-animations · https://emilkowal.ski/ui/good-vs-great-animations · https://animations.dev/
2. **Material Design 3 — easing & duration tokens** — the standard reference token set.
   - https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
3. **Carbon Design System — motion** & **Sprout Seeds motion** — enterprise-grade duration/easing rationale.
   - https://carbondesignsystem.com/elements/motion/overview/ · https://seeds.sproutsocial.com/visual/motion/
4. **Motion design-token guides (2025)** — keep the token set tiny: instant/fast/base/slow + 2–3 easings.
   - https://www.ruixen.com/blog/motion-design-tokens

### Distilled rules
- **Durations**: micro-interactions 160–240ms; enter/exit 240–360ms; UI animation should stay **under ~300ms**; large page/scene transitions 500–700ms only.
- **Easing**: `ease-out` for anything user-triggered (starts fast → feels responsive); `ease-in-out`/custom `ease` for ambient or "elegant" motion (deliberately slower easing = vibe, per Kowalski's taste analysis); springs for anything draggable/physical.
- **Stagger**: 30–80ms between items; longer reads as slow.
- **Never animate keyboard-initiated, high-frequency actions** — repeated hundreds of times, animation makes them feel broken.
- **Intentional vs. noisy**: intentional motion communicates origin/destination or state change and matches the product's overall pace and personality; noisy motion animates things nobody triggered, loops at attention-grabbing amplitude, or eases every property by default. Ambient motion is the exception — allowed to be slow and continuous but must be low-contrast, low-amplitude, and behind the content plane (Windy/Aerial pattern).
- **Accessibility**: everything decorative behind `prefers-reduced-motion`; ambient layers must have a static fallback.

### What NOT to copy
- Material's full 20+-token motion vocabulary (overkill; keep 3–4 durations, 2–3 easings).
- Awwwards scroll-hijack choreography and springy overshoot on data (numbers should never bounce).

---

# Implications for Orbit

## Palette territories

**Theme A — Rainy Midnight City** (cool, exterior, neon-through-glass)
- Canvas: deep blue-charcoal off-blacks, hue 220–240°, e.g. `#0A0E16 → #0D1220` (never #000; blue-black reads "night city," per emotional color mapping à la Ventusky).
- Surface ladder (+3–5% lightness per step): `#10151F`, `#151B27`, `#1B2230`.
- Text: rain-cooled off-white `#E8ECF4` at 100/70/45% steps.
- Accents (ration to one primary + one signal): sodium-lamp amber `#F0A867` OR neon teal `#5EEAD4`; wet-asphalt violet `#8B8FD9` as tertiary glow only. Desaturate any album-art-extracted color toward this base before use.
- Atmosphere: bokeh city lights (blurred warm dots on cool field) + 2–3% film grain + rain layer *behind* the content plane.

**Theme B — Late-Night Bedroom** (warm, interior, lamp-lit)
- Canvas: warm brown-blacks, hue 20–40°, e.g. `#120F0D → #17130F`.
- Surfaces: `#1C1712`, `#221C16`.
- Text: candle-warm off-white `#F2EBE0`.
- Accents: dim tungsten `#E3B577`, ember red-orange `#D98B6A` reserved for alerts; muted sage `#9DB89A` for positive states.
- Lower global contrast than Theme A (bedroom = dimmer, APCA body still ≥ Lc 75); heavier grain (3–4%), softer larger blur radii, warmer scrims.

## Typography (all Google Fonts)

| Role | Primary candidate | Alternate | Notes |
|---|---|---|---|
| Display / big clock & temps | **Fraunces** (opsz axis; soft, warm, editorial without Playfair cliché) | **Newsreader** (cooler, more literary) or **Instrument Serif** (sharper, trendier) | Use at 500–600 weight max on dark; add +1–2% letter-spacing at large light-on-dark sizes |
| Body / UI | **Inter** (enable `tnum` for any inline numbers) | **Geist** or **Instrument Sans** (less default-looking than Inter) | Weights 400–550 only; hierarchy via color steps not bolding |
| Mono / time, data, labels | **IBM Plex Mono** (warm, editorial mono) | **JetBrains Mono** or **Space Grotesk** (grotesque with mono flavor for labels) | ALL-CAPS 11–12px letterspaced micro-labels; tabular by nature so clocks never jitter |

Pairing logic mirrors the 2026 formula: neo-serif display + quiet grotesque + data mono. The giant ambient clock can be the serif (bedroom) or the mono (city) — that single swap differentiates the two themes.

## Spacing / surface / depth
- 8px base grid; generous module padding (24–32px); dashboard density far below Linear's — target 4–6 modules per viewport, one clear hero (time or now-playing).
- Depth = **surface ladder + hairline borders** (`1px` at 6–10% white), not drop shadows. Reserve glow for exactly two things: the accent interaction state and light sources in the scene (bokeh, lamp).
- Content plane sits on translucent dark glass (`backdrop-filter: blur` + 60–75% opaque surface) over the atmospheric layer — the Amado "inside the room" model.
- Grain: one fixed SVG/CSS noise overlay at 2–4% opacity over everything (cheap, unifying, kills banding in dark gradients).
- Recede/foreground: nav, labels, timestamps at 45–55% text opacity; only the focused module at full contrast.

## Motion tokens
```
--duration-instant: 100ms   /* hover tints, focus rings */
--duration-fast:    180ms   /* buttons, toggles, progress-bar grow */
--duration-base:    260ms   /* module enter/exit, expand/collapse */
--duration-slow:    600ms   /* theme/scene cross-fade, ambient-mode entry */
--duration-ambient: 20s+    /* background drift, rain, bokeh shimmer (linear/sine, looping) */

--ease-out:   cubic-bezier(0.16, 1, 0.3, 1)    /* all user-triggered motion */
--ease-inout: cubic-bezier(0.65, 0, 0.35, 1)   /* scene transitions, elegant/ambient moves */
spring (stiffness ~200, damping ~26)            /* anything draggable (scrubber) */
stagger: 40–60ms; no keyboard-action animation; numbers change with a
120ms opacity cross-fade (never slide/bounce); full prefers-reduced-motion
fallback: static gradient scene, instant transitions.
```

## Five pitfalls that make AI-built dashboards look generic
1. **Purple-to-blue gradient on #000 with glassmorphism cards and glow shadows everywhere** — the default AI aesthetic. Fix: one hue-biased off-black, surface-ladder depth, glow rationed to the scene's actual light sources.
2. **Equal-weight card grid** (every module same size, same border, same padding, 3-column). Fix: one hero element per view, asymmetric composition, some data rendered as bare type on the canvas with no card at all.
3. **Default font stack telegraphing template** (Inter-for-everything, or Playfair for "elegance"). Fix: a real three-voice system (serif display / quiet sans / data mono) with tabular figures on every number.
4. **Motion noise**: everything fades-and-slides-up on load, hover-lifts with scale(1.05), counters count up. Fix: animate only state changes; ambient motion slow, low-amplitude, behind the content plane; numbers cross-fade.
5. **Atmosphere as sticker, not system**: a rain GIF/canvas slapped behind unchanged UI. Fix: the environment must drive the tokens — accent hue, scrim warmth, grain level, even easing pace shift with weather/time, while layout and legibility stay fixed (the CARROT/Ventusky/game-menu lesson: UI echoes environment).

---

### Source index (primary)
Awwwards collections (awwwards.com/inspiration/dark-themed-website), Godly (godly.website), Siteinspire (siteinspire.com/websites/category/editorial), darkmodedesign.com, Fireart/Figma/Fontfabric 2026 trend reports, Codrops rain experiments (tympanus.net), raindrop-fx (github.com/SardineFish/raindrop-fx), Amado (github.com/Oililyuk/amado), RainyMood (rainymood.com), Spotify Design/Encore (spotify.design, figma.com/blog), Spotify backdrop analysis (medium.com/@shanmugashree3), CARROT (meetcarrot.com/weather), Hello Weather via Tom's Guide (tomsguide.com/round-up/best-weather-apps), Windy (windy.com), Ventusky (ventusky.com/about), Linear (linear.app/now/how-we-redesigned-the-linear-ui, linear.app/now/behind-the-latest-design-refresh), Linear teardown (getdesign.md/linear.app/design-md), Notion Calendar (efficient.app/apps/notion-calendar), LogRocket on Linear-design genre (blog.logrocket.com/ux-design/linear-design/), Pangram Pangram pairings 2025 (pangrampangram.com), APCA (git.apcacontrast.com, apcacontrast.com), Game UI Database (gameuidatabase.com), Death Stranding UI (interfaceingame.com, fontsinuse.com/uses/67648), Apple TV screensavers (support.apple.com), Clocks.app (clocks.app), Emil Kowalski (emilkowal.ski/ui/great-animations, animations.dev), Material 3 motion (m3.material.io), Carbon motion (carbondesignsystem.com).
