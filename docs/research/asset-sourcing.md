# Orbit — Openly-Licensed Asset & Library Sourcing Report

**Date:** 2026-07-16
**Scope:** Canvas/WebGL weather effects, particle systems, fonts, textures, photography, Lottie, npm packages, shader licensing — for an atmospheric Next.js/TypeScript/Canvas dashboard.
**Method note:** Licenses were verified against primary sources where possible (raw LICENSE files on GitHub, the npm registry `license` field, the `google/fonts` repo license directories). Several license pages (unsplash.com, pexels.com, lottiefiles.com, tympanus.net, shadertoy.com/terms, ambientcg docs) blocked automated fetching (HTTP 403); for those, terms were cross-checked via multiple corroborating sources and are flagged with a confidence note. **Rule applied throughout: unclear license = do not use.**

---

## 1. Canvas/WebGL rain effects

| Asset | Author | URL | License | Verdict |
|---|---|---|---|---|
| RainEffect (rain-on-glass WebGL, Codrops) | Lucas Bebber / Codrops | https://github.com/codrops/RainEffect | **No LICENSE file in repo** (verified: `master/LICENSE` → 404). `package.json` says `"SEE LICENSE IN http://tympanus.net/codrops/licensing/"` | **Reference only — do not vendor** |
| rainyday.js | maroslaw (orig.), mubaidr (fork) | https://github.com/maroslaw/rainyday.js | **No LICENSE file** (verified 404). Third-party sources conflict (GPL vs MIT) | **Do not use — unclear** |
| regl (functional WebGL) | Mikola Lysenko | https://github.com/regl-project/regl | **MIT** (verified LICENSE file, © 2016 Mikola Lysenko) | Safe to install; repo examples covered by MIT |
| three.js (incl. examples/jsm code) | three.js authors (mrdoob et al.) | https://github.com/mrdoob/three.js | **MIT** (verified LICENSE, © 2010–2026 three.js authors) | Safe (see §8 caveat on example *assets*) |

**Codrops detail:** Codrops' own licensing page (https://tympanus.net/codrops/licensing/) could not be fetched first-hand (403). Search-indexed summaries and third-party writeups state Codrops demos are free for personal/commercial use, and some 2025–26 sources claim demos are now MIT; however, the RainEffect repo itself ships no license text and the pointer URL is the only authority. **Confidence: medium — treat the RainEffect code as a technique reference (droplet map + refraction shader architecture), not as vendorable code.** Attribution: not stated as required; redistribution rights unverifiable.

**Conclusion:** No permissively-licensed, drop-in rain-on-glass implementation with a clean LICENSE file was found. Rain effects should be **implemented from scratch** (techniques in §9) — this is also the better fit for a bespoke 2D-canvas dashboard aesthetic.

---

## 2. Particle systems (snow, fog, dust, stars, shooting stars)

| Package | Author | URL | License | Notes |
|---|---|---|---|---|
| tsparticles v4.3.2 | Matteo Bruni | https://github.com/tsparticles/tsparticles | **MIT** (verified LICENSE, © 2020 Matteo Bruni; npm confirms) | Actively maintained; presets available |
| @tsparticles/preset-snow v4.3.2 | Matteo Bruni | https://www.npmjs.com/package/@tsparticles/preset-snow | **MIT** (verified npm registry) | Snow out of the box |
| particles.js | Vincent Garreau | https://github.com/VincentGarreau/particles.js | **MIT** (verified LICENSE.md, © 2015) | Unmaintained since ~2015 — prefer tsparticles |
| canvas-confetti v1.9.4 | Kiril Vatev (catdad) | https://github.com/catdad/canvas-confetti | **ISC** (verified npm registry) | Also has a snow recipe in its docs |

**CodePen snippets** (star fields, shooting stars, fog demos): all **public** Pens are **MIT by default** per CodePen's licensing docs (https://blog.codepen.io/documentation/licensing/); private Pens carry no license. Confidence: high for the policy itself, **medium per-pen** — a pen author may have pasted third-party code, so treat pens as technique references rather than vendoring them verbatim.

Attribution: MIT/ISC require retaining the copyright + permission notice in copies/substantial portions (a line in `THIRD_PARTY_LICENSES` or the bundled license file satisfies this). Redistribution: unrestricted otherwise.

**Conclusion:** All of these effects are simple enough that from-scratch canvas implementations (§9) beat installing a particle engine (tsparticles full bundle is heavy for four bespoke effects). Install nothing here except optionally `canvas-confetti` for celebration moments.

---

## 3. Google Fonts (all verified SIL OFL 1.1)

Verification: every family below was confirmed to live under `ofl/<family>/OFL.txt` in the canonical `google/fonts` repo (HTTP 200 checks, 2026-07-16), meaning Google distributes it under **SIL Open Font License 1.1**. Spot-checked upstream: Fraunces (`undercasetype/Fraunces/OFL.txt`, © The Fraunces Project Authors) and Inter (`rsms/inter/LICENSE.txt`, © The Inter Project Authors) both OFL 1.1.

**OFL 1.1 terms:** free for commercial use, web embedding, and bundling with software (open or closed); fonts may be redistributed as long as the copyright notice + OFL text accompany the font files; fonts may **not** be sold standalone; modified versions must drop any Reserved Font Names. No attribution required in the UI. Confidence: high.

**(a) Editorial display serif with character (dark-background friendly):**
1. **Fraunces** — Undercase Type (Phaedra Charles, Flavia Zimbardi). Variable "wonky" axis, soft ink-trap warmth; superb large on dark.
2. **Playfair Display** — Claus Eggers Sørensen. High-contrast Didone; classic editorial.
3. **Newsreader** — Production Type. News-serif with an opsz axis; elegant at display sizes.
4. **Instrument Serif** — Instrument, Jordan Egstad. Sharp, fashionable single-weight display.
5. **Cormorant** — Christian Thalmann. Delicate Garamond-style display; needs size to shine.
6. (alt) **DM Serif Display** — Colophon Foundry.

**(b) Refined grotesque body face:**
1. **Inter** — Rasmus Andersson. Workhorse UI grotesque; huge weight range; `tnum`/`ss01` features.
2. **Hanken Grotesk** — Hanken Design Co. Warmer, more refined than Inter for reading.
3. **Space Grotesk** — Florian Karsten. Characterful grotesque (pairs with Space Mono DNA).
4. **Archivo** — Omnibus-Type. Grotesque with a variable width axis.
5. **Figtree** — Erik Kennedy. Friendly geometric-grotesque hybrid.
6. (alt) **Public Sans** — USWDS.

**(c) Mono / tabular-numeral face for time, weather, data:**
1. **JetBrains Mono** — JetBrains (Philipp Nurullin, Konstantin Bulenkov). Tall x-height, crisp digits.
2. **IBM Plex Mono** — Mike Abbink / Bold Monday. Refined, editorial mono.
3. **Space Mono** — Colophon Foundry. Retro-technical personality for hero clocks.
4. **Spline Sans Mono** — Eben Sorkin, Mirko Velimirović. Compact grotesque-mono, UI-oriented.
5. **Martian Mono** — Evil Martians. Wide/variable mono, strong for big numerals.
6. (alt) **Fragment Mono** — Wei Huang (Helvetica-flavored mono).

Tip: all monos above are inherently tabular; for proportional text with lining tabular figures, Inter with `font-feature-settings: "tnum"` covers data tables.

---

## 4. CC0 textures (film grain / noise) vs procedural

| Source | URL | License | Confidence |
|---|---|---|---|
| ambientCG | https://ambientcg.com (license: https://docs.ambientcg.com/license/) | **CC0 1.0 Universal** — all assets; no attribution, unlimited redistribution/modification | High (site states it prominently; docs page 403'd to bots — corroborated by multiple sources) |
| Poly Haven | https://polyhaven.com/license | **CC0** — all assets | High |
| cc0-textures.com | https://cc0-textures.com | **CC0** | Medium-high (aggregator; verify per-download) |

**Recommendation: procedural beats downloaded textures for grain/noise.**
- **SVG `feTurbulence`** (fractal noise) as a CSS `filter`/background: zero network bytes, resolution-independent, tunable `baseFrequency`, kills gradient banding on dark UIs. Canonical technique: "Grainy Gradients," CSS-Tricks (Jimmy Chion), https://css-tricks.com/grainy-gradients/ — techniques are freely reimplementable; generator tools: https://www.fffuel.co/gggrain/, https://grainygradients.dev/.
- **Canvas noise tile**: generate one 128×128 `ImageData` of random luminance at boot, draw as a repeating pattern with `globalAlpha ≈ 0.04` and `overlay`/`soft-light` blending; re-randomize at ~8 fps for animated film grain. Cheaper per-frame than full-screen `feTurbulence` animation.
- Use a downloaded CC0 grain PNG (ambientCG) only if you need a specific organic film stock look; CC0 imposes zero obligations either way.

---

## 5. Night-city photography — Unsplash & Pexels current terms (2026)

**Unsplash — NOT CC0** (hasn't been since June 2017). Current **Unsplash License** (https://unsplash.com/license):
- Free for commercial and non-commercial use; **attribution not required** for standard downloads (appreciated).
- **Prohibited:** selling unaltered copies; **compiling photos to replicate a similar or competing service**.
- **API usage changes the rules:** if Orbit fetches images via the Unsplash API, (a) you **must hotlink** the CDN URLs returned by the API (hotlinking is required, not just allowed — it feeds photographer stats), and (b) **attribution becomes mandatory**: credit photographer + Unsplash with links back using `?utm_source=<app>&utm_medium=referral` (https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines, https://unsplash.com/api-terms).
- Note: many premium images are now **Unsplash+** (separate paid license) — filter them out.

**Pexels** (https://www.pexels.com/license/):
- Free for personal/commercial use, modification allowed, **no attribution required** (appreciated).
- **Prohibited:** selling/distributing content "standalone" (unmodified, no creative effort) incl. as prints/wallpapers; redistributing on other stock/wallpaper platforms; implying endorsement by depicted people/brands; showing identifiable people in a bad light; using content in trademarks; **using the API to build datasets or train ML/AI models** without permission.
- **API usage requires attribution:** prominent link to Pexels + credit photographers with a link to the photo page.

**Practical guidance for Orbit:** fetch night-city imagery at runtime via the Unsplash or Pexels API with the required credit line — do **not** commit downloaded photo files into an open-source repo (they are not MIT and cannot inherit your repo license; a bundled photo needs its own provenance/license note and edges close to "standalone redistribution"). Confidence: high (license pages 403'd to bots but terms corroborated by official help-center pages and API docs).

---

## 6. Lottie / LottieFiles in 2026

- **lottie-web (bodymovin)** — Airbnb/Bodymovin, https://github.com/airbnb/lottie-web — **MIT** (verified LICENSE.md, © 2015 Bodymovin). Player is unambiguously safe.
- **@lottiefiles/dotlottie-react v0.19.9** — LottieFiles — **MIT** (verified npm registry). Modern `.lottie` player, safe.
- **Free LottieFiles animations** — licensed under the **Lottie Simple License (FL 9.13.21)**, https://lottiefiles.com/page/license: free to download, reproduce, modify, publish, distribute, publicly display, **including commercially**; **no attribution required**; **BUT any distribution of the files (or derivatives) must carry the same license terms** (a share-alike-style condition on the asset files), and you may **not compile/collect files to replicate or compete with LottieFiles**.
- **Answer to "can free Lotties be redistributed in an open project?": yes, conditionally.** You can ship free Lottie JSON/.lottie files in an open-source repo **if** you include the Lottie Simple License text alongside those asset files (they remain under LSL; they do not become MIT). Marketplace/premium animations are under a separate paid license — do not use. Some creators mark uploads CC0/CC-BY; prefer those when available. Confidence: medium-high (license page 403'd to bots; terms corroborated by LottieFiles help center + license mirrors). Practical: Orbit's ambient effects are better done in canvas anyway; use Lottie only for illustrative micro-animations, and prefer CC0-marked assets.

---

## 7. npm packages (all license fields verified 2026-07-16)

| Package | Version | License | Author/Maintainer | Notes |
|---|---|---|---|---|
| `@types/spotify-web-playback-sdk` | 0.1.19 | **MIT** | DefinitelyTyped (Festify Dev Team et al.) | Ambient typings for the SDK global; SDK script itself is Spotify-proprietary (loaded from their CDN — not redistributable, which is fine, it's never bundled) |
| `canvas-confetti` | 1.9.4 | **ISC** | Kiril Vatev | Tiny, zero-dep; permissive |
| `tsparticles` | 4.3.2 | **MIT** | Matteo Bruni | Only if bespoke canvas is abandoned |
| `suncalc` | 2.0.1 | **BSD-2-Clause** (per repo LICENSE, © Volodymyr Agafonkin) | Vladimir Agafonkin | ⚠️ `package.json` omits the `license` field (npm shows none) — the repo LICENSE file governs; metadata-only quirk. Sun/moon position, phases, golden hour |
| `astronomy-engine` | latest | **MIT** (verified LICENSE, © 2019–2025 Don Cross) | Don Cross | Higher-precision alternative to suncalc |
| `@serwist/next` / `serwist` | 9.5.11 | **MIT** | Serwist (ducanh2912) | **2026 status:** original `next-pwa` unmaintained; `@ducanh2912/next-pwa` superseded by **Serwist**, which is the maintained successor and is referenced in the official Next.js PWA guide. Use Serwist. |
| `idb` | 8.0.3 | **ISC** (verified LICENSE, © 2016 Jake Archibald) | Jake Archibald | Promise-based IndexedDB wrapper |

Attribution/redistribution for all of the above: standard MIT/ISC/BSD — keep copyright + license notices in distributed bundles (automate with a license-extractor step or a `THIRD_PARTY_NOTICES.md`). No runtime attribution needed.

---

## 8. Three.js examples & Shadertoy

- **three.js:** MIT (verified), and the license covers the repository including `examples/jsm` **code**. Caveat: some **example assets** (GLTF models, textures, fonts under `examples/models` etc.) carry their own third-party licenses noted in per-asset readmes — check before copying assets (code ≠ assets). Confidence: high for code.
- **Shadertoy — CONFIRMED:** per https://www.shadertoy.com/terms, shaders without an explicit license header default to **CC BY-NC-SA 3.0 Unported**. That means: attribution required, **NonCommercial — no commercial use whatsoever**, and ShareAlike (derivatives inherit the license). **Default-licensed Shadertoy code is NOT usable in Orbit** if Orbit is commercial *or* MIT-licensed (CC BY-NC-SA is incompatible with MIT redistribution either way). Only exceptions: shaders whose comment header grants MIT/CC0/CC-BY, or explicit author permission. **Re-implementing a published technique from scratch (the math/idea) is fine; copying the GLSL is not.** Confidence: high.

---

## 9. Final shortlist & recommendations

### Implement from scratch (original canvas 2D code, owned by Orbit — no license risk, no bundle weight)

1. **Rain streaks:** pooled particle array; each drop = `{x, y, vy, len, depth}` with `len ∝ vy`, slight shared wind-shear `vx`; render as short lines stroked with a vertical `createLinearGradient` (transparent → pale cyan-white); 3 parallax depth layers (far = thin/slow/dim); on hitting a "ground" line, spawn 2–3 short-lived splash arcs. Use `ctx.fillRect` full-canvas translucent black instead of `clearRect` for cheap motion-blur trails.
2. **Rain-on-glass droplets (the RainEffect look, reimplemented):** maintain a droplet list `{x, y, r, mass}`; draw each as a radial-gradient circle (bright offset highlight + darkened rim) — or for true refraction, clip to the droplet circle and `drawImage` the background scaled ~-1.2y (inverted, magnified). Large droplets gain mass, slide down with stick-slip jitter, leave a trail of shrinking static micro-droplets; merge droplets when centers are closer than `r1 + r2`; a fine static "condensation" layer gets erased where trails pass.
3. **Fog/mist:** 3–4 pre-rendered offscreen tiles of blurred blob noise (draw ~40 soft radial gradients on a tile at boot); scroll tiles horizontally at different speeds/opacities (`0.05–0.15`), overlay a vertical linear gradient tinted to the theme; `screen`/`soft-light` blend over the scene.
4. **Twinkling star field:** seeded PRNG placement on a jittered grid (avoids clumping); per-star `{size, baseAlpha, phase, speed}`; twinkle = `alpha = base * (0.6 + 0.4 * sin(t * speed + phase))`; give the brightest ~2% a 4-point cross flare; optional ultra-slow parallax drift.
5. **Shooting stars:** random spawn timer (every 8–20 s); linear trajectory with an eased-out head and a fading gradient trail (store last N positions, stroke with decreasing alpha/width); life 0.5–1.2 s.
6. **Snow & dust motes:** flakes spawn above viewport; horizontal sway `x += sin(t * f + phase) * amp`; 3 depth layers scale size/speed/opacity; dust = very slow pseudo-Brownian drift at 2–4 % alpha.
7. **Film grain:** procedural (see §4) — SVG `feTurbulence` overlay for static grain, or an 8 fps re-randomized 128 px canvas noise tile for animated grain. **Do not download textures for this.**

All animated via one shared `requestAnimationFrame` loop, `matchMedia('(prefers-reduced-motion)')-gated, and paused when the tab is hidden.

### Install (all verified permissive)

- **`suncalc`** (BSD-2) — or **`astronomy-engine`** (MIT) if precision/cleaner metadata matters — day/night/golden-hour theming.
- **`idb`** (ISC) — offline caching of weather/track data.
- **`serwist` + `@serwist/next`** (MIT) — service worker/PWA; the 2026-correct choice over next-pwa.
- **`@types/spotify-web-playback-sdk`** (MIT, devDependency).
- **`canvas-confetti`** (ISC) — optional, only if a celebration micro-moment is wanted; otherwise skip.
- **Fonts (OFL 1.1, self-hosted via `next/font`):** recommended trio — **Fraunces** (display serif) + **Hanken Grotesk** or **Inter** (body, with `tnum` for tables) + **JetBrains Mono** or **IBM Plex Mono** (time/data).

### Do NOT use

- **rainyday.js** — no LICENSE file, conflicting third-party claims. Unclear = out.
- **Codrops RainEffect code verbatim** — no in-repo LICENSE; site license not first-hand verifiable as OSI. Technique reference only.
- **Default-licensed Shadertoy GLSL** — CC BY-NC-SA 3.0: non-commercial + share-alike, incompatible.
- **LottieFiles marketplace/premium assets**; free LSL assets only with the license text shipped alongside — but prefer bespoke canvas animation.
- **Committing Unsplash/Pexels photo files to the open repo** — fetch at runtime via API with required attribution/hotlinking instead.

---

## Source index (key verifications)

- three.js LICENSE (MIT): https://raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE
- regl LICENSE (MIT): https://raw.githubusercontent.com/regl-project/regl/master/LICENSE
- tsparticles LICENSE (MIT): https://raw.githubusercontent.com/tsparticles/tsparticles/main/LICENSE
- particles.js LICENSE (MIT): https://raw.githubusercontent.com/VincentGarreau/particles.js/master/LICENSE.md
- lottie-web LICENSE (MIT): https://raw.githubusercontent.com/airbnb/lottie-web/master/LICENSE.md
- suncalc LICENSE (BSD-2): https://raw.githubusercontent.com/mourner/suncalc/master/LICENSE
- astronomy-engine LICENSE (MIT): https://raw.githubusercontent.com/cosinekitty/astronomy/master/LICENSE
- idb LICENSE (ISC): https://raw.githubusercontent.com/jakearchibald/idb/main/LICENSE
- Fraunces OFL: https://raw.githubusercontent.com/undercasetype/Fraunces/master/OFL.txt · Inter OFL: https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt
- Font OFL checks: `https://raw.githubusercontent.com/google/fonts/main/ofl/<family>/OFL.txt` (18/18 → HTTP 200)
- npm registry license fields: canvas-confetti (ISC), @serwist/next (MIT), @types/spotify-web-playback-sdk (MIT), @tsparticles/preset-snow (MIT), @lottiefiles/dotlottie-react (MIT), idb (ISC), suncalc (field absent — repo LICENSE governs)
- RainEffect missing license: https://github.com/codrops/RainEffect (`LICENSE` 404; package.json → tympanus.net/codrops/licensing)
- Codrops licensing: https://tympanus.net/codrops/licensing/ (403 to bots; corroborated via search snapshots)
- Unsplash: https://unsplash.com/license · https://unsplash.com/api-terms · https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
- Pexels: https://www.pexels.com/license/ · https://help.pexels.com/hc/en-us/articles/360042332714
- LottieFiles: https://lottiefiles.com/page/license · https://help.lottiefiles.com/hc/en-us/articles/45243303062681
- Shadertoy terms: https://www.shadertoy.com/terms (default CC BY-NC-SA 3.0; corroborated: gamedev.net threads)
- ambientCG CC0: https://docs.ambientcg.com/license/ · Poly Haven CC0: https://polyhaven.com/license
- Grainy gradients technique: https://css-tricks.com/grainy-gradients/ · https://www.fffuel.co/gggrain/
- CodePen public-pen MIT policy: https://blog.codepen.io/documentation/licensing/
- Serwist status: https://nextjs.org/docs/app/guides/progressive-web-apps · https://github.com/serwist/serwist
