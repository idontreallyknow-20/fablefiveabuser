// Original effect implementations for the Orbit atmosphere engine.
// Techniques: pooled particles, seeded layouts, offscreen noise tiles.
//
// Performance contract: the per-frame path never constructs gradients,
// never touches ctx.filter, and batches particle geometry. Anything
// static is baked to an offscreen canvas keyed on its inputs and blitted.

import type { EffectFactory } from "./engine";
import { mulberry32 } from "./engine";

const TAU = Math.PI * 2;

/* --------------------------------------------------------- bake helpers -- */

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** single-slot memoized offscreen canvas, rebaked only when the key changes */
function memoCanvas() {
  let key = "";
  let canvas: HTMLCanvasElement | null = null;
  return (
    k: string,
    w: number,
    h: number,
    paint: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  ) => {
    if (k !== key || !canvas) {
      key = k;
      canvas = makeCanvas(w, h);
      paint(canvas.getContext("2d")!, canvas.width, canvas.height);
    }
    return canvas;
  };
}

/** soft radial sprite; stops are [offset, color] pairs */
function glowSprite(size: number, stops: [number, string][]) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** small round particle sprite with a soft edge */
function dotSprite(color: string) {
  return glowSprite(16, [
    [0, color],
    [0.65, color],
    [1, "transparent"],
  ]);
}

/* ------------------------------------------------------------------ sky -- */

const PHASE_TINT: Record<string, { top: string; horizon: string; alpha: number }> = {
  predawn: { top: "#0b1026", horizon: "#2b2036", alpha: 0.5 },
  sunrise: { top: "#1a2038", horizon: "#8a5a3c", alpha: 0.55 },
  morning: { top: "#2a3d5c", horizon: "#63758e", alpha: 0.5 },
  midday: { top: "#33517a", horizon: "#7d92ab", alpha: 0.5 },
  golden: { top: "#2c2f4a", horizon: "#9a6a3a", alpha: 0.55 },
  sunset: { top: "#191c38", horizon: "#7c4634", alpha: 0.55 },
  "blue-hour": { top: "#0c1230", horizon: "#28355c", alpha: 0.55 },
  night: { top: "#000000", horizon: "#000000", alpha: 0 },
};

export const skyGradient: EffectFactory = () => {
  const baked = memoCanvas();
  const glowSprites = new Map<string, HTMLCanvasElement>();

  return {
    draw(ctx, s) {
      const { w, h, theme, env } = s;
      const phaseKey = theme.timeReactive ? env.phase : "static";
      const sky = baked(`${w}x${h}:${theme.id}:${phaseKey}`, w, h, (g, bw, bh) => {
        const grad = g.createLinearGradient(0, 0, 0, bh);
        grad.addColorStop(0, theme.sky.top);
        grad.addColorStop(0.55, theme.sky.mid);
        grad.addColorStop(1, theme.sky.horizon);
        g.fillStyle = grad;
        g.fillRect(0, 0, bw, bh);
        if (theme.timeReactive) {
          const tint = PHASE_TINT[env.phase];
          if (tint && tint.alpha > 0) {
            const tg = g.createLinearGradient(0, 0, 0, bh);
            tg.addColorStop(0, tint.top);
            tg.addColorStop(1, tint.horizon);
            g.globalAlpha = tint.alpha * 0.45;
            g.globalCompositeOperation = "screen";
            g.fillStyle = tg;
            g.fillRect(0, 0, bw, bh);
          }
        }
      });
      ctx.drawImage(sky, 0, 0, w, h);

      // music glow: a faint pool of album color low in the scene
      if (env.glowColor) {
        let sprite = glowSprites.get(env.glowColor);
        if (!sprite) {
          sprite = glowSprite(256, [
            [0, env.glowColor],
            [1, "transparent"],
          ]);
          glowSprites.set(env.glowColor, sprite);
          if (glowSprites.size > 8) {
            const first = glowSprites.keys().next().value;
            if (first && first !== env.glowColor) glowSprites.delete(first);
          }
        }
        const r = Math.max(w, h) * 0.5;
        ctx.globalAlpha = 0.07;
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(sprite, w * 0.78 - r, h * 0.92 - r, r * 2, r * 2);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
    },
  };
};

/* ----------------------------------------------------------------- rain -- */

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  bucket: number;
}

const RAIN_BUCKET_ALPHA = [0.07, 0.11, 0.15, 0.19];

export const rain: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let drops: Drop[] = [];
  let flash = 0;
  let nextFlash = 20 + rng() * 30;

  const spawn = (w: number, h: number, n: number) => {
    drops = Array.from({ length: n }, () => ({
      x: rng() * w,
      y: rng() * h,
      len: 8 + rng() * 18,
      speed: 380 + rng() * 520,
      bucket: Math.floor(rng() * 4),
    }));
  };

  return {
    resize(w, h) {
      spawn(w, h, Math.round(w / 6));
    },
    draw(ctx, s) {
      const { w, h, dt, env, intensity, depth, px } = s;
      const target = Math.round(
        (w / 6) * intensity * env.quality * Math.min(1.6, 0.5 + env.weather.precipitation * 0.35),
      );
      if (drops.length === 0) spawn(w, h, Math.max(24, target));
      const count = Math.min(drops.length, Math.max(24, target));
      const wind = (env.weather.windKph / 60) * 14 + px * 6;
      const lenScale = 0.7 + depth * 0.6;
      const fall = 0.5 + depth * 0.7;

      // advance all drops once, then stroke one batched path per alpha bucket
      for (let i = 0; i < count; i++) {
        const d = drops[i];
        d.y += d.speed * dt * fall;
        d.x += wind * dt * d.speed * 0.05;
        if (d.y > h + d.len) {
          d.y = -d.len - rng() * 40;
          d.x = rng() * (w + 80) - 40;
        }
      }
      ctx.strokeStyle = "rgb(178, 199, 235)";
      ctx.lineCap = "round";
      ctx.lineWidth = depth > 0.6 ? 1.2 : 0.8;
      const alphaScale = 0.55 + depth * 0.45;
      for (let b = 0; b < 4; b++) {
        ctx.globalAlpha = RAIN_BUCKET_ALPHA[b] * alphaScale;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const d = drops[i];
          if (d.bucket !== b) continue;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - wind * 0.35, d.y - d.len * lenScale);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // rare lightning, only in a real storm and only at cinematic quality
      if (env.weather.isStorm && env.quality > 1.2 && !env.still) {
        nextFlash -= dt;
        if (nextFlash <= 0) {
          flash = 0.55;
          nextFlash = 24 + rng() * 46;
        }
        if (flash > 0.01) {
          ctx.globalAlpha = flash * 0.5;
          ctx.fillStyle = "#cdd8ee";
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
          flash *= Math.exp(-dt * 6);
        }
      }
    },
  };
};

/* --------------------------------------------------- droplets on glass -- */

interface Bead {
  x: number;
  y: number;
  r: number;
  vy: number;
  wob: number;
  sliding: boolean;
}

/** bead sprite: highlight offset up-left, shadowed rim */
function makeBeadSprite() {
  const size = 64;
  const c = makeCanvas(size, size);
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r - r * 0.35, r - r * 0.45, r * 0.1, r, r, r);
  grad.addColorStop(0, "rgba(210, 226, 250, 0.34)");
  grad.addColorStop(0.6, "rgba(160, 185, 220, 0.13)");
  grad.addColorStop(1, "rgba(20, 30, 50, 0.16)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(r, r, r, 0, TAU);
  g.fill();
  return c;
}

export const droplets: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let beads: Bead[] = [];
  let sprite: HTMLCanvasElement | null = null;

  const spawn = (w: number, h: number, n: number) => {
    beads = Array.from({ length: n }, () => ({
      x: rng() * w,
      y: rng() * h,
      r: 0.6 + rng() * 2.4,
      vy: 0,
      wob: rng() * TAU,
      sliding: false,
    }));
  };

  return {
    resize(w, h) {
      spawn(w, h, Math.round(w / 22));
    },
    draw(ctx, s) {
      const { w, h, dt, env, intensity } = s;
      if (!sprite) sprite = makeBeadSprite();
      if (beads.length === 0) spawn(w, h, Math.round(w / 22));
      const wet = Math.min(1.4, 0.35 + env.weather.precipitation * 0.4) * intensity * env.quality;
      const count = Math.min(beads.length, Math.round((w / 22) * wet));

      for (let i = 0; i < count; i++) {
        const b = beads[i];
        // growth while stuck; slide once heavy
        if (!b.sliding) {
          b.r += dt * 0.16 * wet;
          if (b.r > 2.6 + rng() * 2.2) b.sliding = true;
        } else {
          b.vy = Math.min(60, b.vy + dt * 40);
          b.wob += dt * 7;
          b.y += b.vy * dt;
          b.x += Math.sin(b.wob) * 0.35;
          b.r = Math.max(1.2, b.r - dt * 0.5);
          if (b.r <= 1.25) b.sliding = false;
        }
        if (b.y > h + 6) {
          b.y = -6;
          b.x = rng() * w;
          b.r = 0.6 + rng() * 1.6;
          b.vy = 0;
          b.sliding = false;
        }
        ctx.drawImage(sprite, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
    },
  };
};

/* ------------------------------------------------------------------ fog -- */

export const fog: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let tile: HTMLCanvasElement | null = null;

  const makeTile = () => {
    const c = makeCanvas(512, 256);
    const g = c.getContext("2d")!;
    for (let i = 0; i < 46; i++) {
      const x = rng() * 512;
      const y = rng() * 256;
      const r = 40 + rng() * 90;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(190, 205, 225, 0.05)");
      grad.addColorStop(1, "transparent");
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
  };

  return {
    draw(ctx, s) {
      const { w, h, t, env, intensity, py } = s;
      if (!tile) tile = makeTile();
      const haze = intensity * (1.35 - env.weather.visibility) + intensity * 0.35;
      const bands = env.quality > 0.7 ? 3 : 2;
      for (let b = 0; b < bands; b++) {
        const speed = 6 + b * 5;
        const off = (t * speed) % 512;
        const y = h * (0.35 + b * 0.22) + py * 8 * (b + 1);
        ctx.globalAlpha = Math.min(0.9, haze) * (0.5 - b * 0.12);
        for (let x = -off - 512; x < w + 512; x += 512) {
          ctx.drawImage(tile, x, y, 512, 300 + b * 60);
        }
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ---------------------------------------------------------------- stars -- */

export const stars: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let pts: { x: number; y: number; r: number; tw: number; sp: number }[] = [];
  let sprite: HTMLCanvasElement | null = null;

  return {
    resize(w, h) {
      const n = Math.round((w * h) / 5200);
      pts = Array.from({ length: n }, () => ({
        x: rng() * w,
        y: rng() * h * 0.85,
        r: rng() < 0.85 ? 0.7 + rng() * 0.7 : 1.3 + rng() * 1.1,
        tw: rng() * TAU,
        sp: 0.3 + rng() * 1.4,
      }));
    },
    draw(ctx, s) {
      const { w, h, t, env, intensity, px, py } = s;
      if (!sprite) sprite = dotSprite("#dbe6f7");
      if (pts.length === 0) this.resize?.(w, h);
      // stars fade with cloud cover
      const vis = intensity * (1 - env.weather.cloudCover * 0.85) * env.quality;
      if (vis <= 0.02) return;
      const base = Math.min(1, vis) * 0.8;
      const ox = px * 6;
      const oy = py * 4;
      for (const p of pts) {
        const twinkle = 0.55 + 0.45 * Math.sin(p.tw + t * p.sp);
        ctx.globalAlpha = base * twinkle;
        ctx.drawImage(sprite, p.x + ox - p.r, p.y + oy - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
    },
  };
};

export const shootingStars: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let active: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  let next = 14 + rng() * 26;
  let streak: HTMLCanvasElement | null = null;

  const makeStreak = () => {
    // horizontal streak sprite, head at the right edge
    const c = makeCanvas(96, 4);
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(96, 2, 0, 2);
    grad.addColorStop(0, "rgba(230, 240, 255, 0.9)");
    grad.addColorStop(1, "transparent");
    g.strokeStyle = grad;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(96, 2);
    g.lineTo(0, 2);
    g.stroke();
    return c;
  };

  return {
    draw(ctx, s) {
      const { w, h, dt, env, intensity } = s;
      if (env.still || env.weather.cloudCover > 0.6) return;
      if (!streak) streak = makeStreak();
      next -= dt;
      if (!active && next <= 0) {
        const ang = Math.PI * (0.15 + rng() * 0.2);
        active = {
          x: w * (0.2 + rng() * 0.6),
          y: h * (0.05 + rng() * 0.25),
          vx: Math.cos(ang) * 640,
          vy: Math.sin(ang) * 640,
          life: 0.9,
        };
        next = 18 + rng() * 34;
      }
      if (active) {
        active.life -= dt;
        active.x += active.vx * dt;
        active.y += active.vy * dt;
        const a = Math.max(0, active.life) * intensity;
        ctx.save();
        ctx.translate(active.x, active.y);
        ctx.rotate(Math.atan2(active.vy, active.vx));
        ctx.globalAlpha = a;
        ctx.drawImage(streak, -90, -2, 90, 4);
        ctx.restore();
        ctx.globalAlpha = 1;
        if (active.life <= 0 || active.x > w + 90) active = null;
      }
    },
  };
};

/* ----------------------------------------------------------------- snow -- */

export const snow: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let flakes: { x: number; y: number; r: number; sp: number; sw: number; ph: number }[] = [];
  let sprite: HTMLCanvasElement | null = null;

  return {
    resize(w, h) {
      const n = Math.round(w / 7);
      flakes = Array.from({ length: n }, () => ({
        x: rng() * w,
        y: rng() * h,
        r: 0.8 + rng() * 2.1,
        sp: 18 + rng() * 42,
        sw: 8 + rng() * 22,
        ph: rng() * TAU,
      }));
    },
    draw(ctx, s) {
      const { w, h, t, dt, env, intensity, depth, px } = s;
      if (!sprite) sprite = dotSprite("#e8eef8");
      if (flakes.length === 0) this.resize?.(w, h);
      const fall = Math.min(1.5, 0.5 + env.weather.precipitation * 0.5);
      const count = Math.min(flakes.length, Math.round(flakes.length * intensity * fall * env.quality));
      for (let i = 0; i < count; i++) {
        const f = flakes[i];
        f.y += f.sp * dt * (0.5 + depth * 0.8);
        const x = f.x + Math.sin(f.ph + t * 0.7) * f.sw + px * 10 * depth;
        if (f.y > h + 4) {
          f.y = -4;
          f.x = rng() * w;
        }
        ctx.globalAlpha = 0.25 + f.r * 0.16;
        ctx.drawImage(sprite, x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ----------------------------------------------------------- dust motes -- */

export const dust: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let motes: { x: number; y: number; r: number; vx: number; vy: number; ph: number }[] = [];
  let sprite: HTMLCanvasElement | null = null;

  return {
    resize(w, h) {
      const n = Math.round(w / 26);
      motes = Array.from({ length: n }, () => ({
        x: rng() * w,
        y: rng() * h,
        r: 0.5 + rng() * 1.3,
        vx: (rng() - 0.5) * 6,
        vy: -2 - rng() * 5,
        ph: rng() * TAU,
      }));
    },
    draw(ctx, s) {
      const { w, h, t, dt, intensity, env, px, py } = s;
      if (!sprite) sprite = dotSprite("#e9e2cf");
      if (motes.length === 0) this.resize?.(w, h);
      const count = Math.round(motes.length * intensity * env.quality);
      for (let i = 0; i < count; i++) {
        const m = motes[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -4 || m.x < -4 || m.x > w + 4) {
          m.x = rng() * w;
          m.y = h + 4;
        }
        ctx.globalAlpha = 0.05 + 0.09 * Math.abs(Math.sin(m.ph + t * 0.5));
        ctx.drawImage(sprite, m.x + px * 14 - m.r, m.y + py * 10 - m.r, m.r * 2, m.r * 2);
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ------------------------------------------------------------- caustics -- */

export const caustics: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  const phases = Array.from({ length: 4 }, () => rng() * TAU);
  const rayBake = memoCanvas();

  return {
    draw(ctx, s) {
      const { w, h, t, intensity, env } = s;
      ctx.globalCompositeOperation = "screen";

      // slow god-rays from above: one baked ray, blitted at drifting offsets.
      // local coordinate: ray apex column at x=0.2*w inside a 0.5*w canvas.
      const ray = rayBake(`${w}x${h}`, w * 0.5, h, (g, bw, bh) => {
        const cx = bw * 0.4;
        const grad = g.createLinearGradient(cx, 0, cx + w * 0.12, bh);
        grad.addColorStop(0, "rgba(110, 200, 180, 0.05)");
        grad.addColorStop(1, "transparent");
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(cx - w * 0.02, 0);
        g.lineTo(cx + w * 0.1, 0);
        g.lineTo(cx + w * 0.28, bh);
        g.lineTo(cx - w * 0.2, bh);
        g.closePath();
        g.fill();
      });
      ctx.globalAlpha = intensity;
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.2 + i * 0.3) + Math.sin(t * 0.05 + phases[i]) * w * 0.06;
        ctx.drawImage(ray, cx - w * 0.2, 0);
      }
      ctx.globalAlpha = 1;

      // rippling light bands
      const bands = env.quality > 0.7 ? 3 : 2;
      for (let b = 0; b < bands; b++) {
        ctx.beginPath();
        const y0 = h * (0.25 + b * 0.25);
        for (let x = 0; x <= w; x += 16) {
          const y =
            y0 +
            Math.sin(x * 0.012 + t * (0.5 + b * 0.2) + phases[b]) * 14 +
            Math.sin(x * 0.03 - t * 0.3) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(120, 210, 190, ${0.05 * intensity})`;
        ctx.lineWidth = 22 - b * 5;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },
  };
};

/* ---------------------------------------------------- city lights ------- */

interface Building {
  x: number;
  w: number;
  h: number;
  row: number;
  windows: { x: number; y: number; on: number; warm: boolean }[];
}

export const cityLights: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let buildings: Building[] = [];
  let cars: { x: number; v: number; red: boolean; y: number }[] = [];
  // baked layers: buildings+static windows per row, ground+skyline glow
  let rowBodies: HTMLCanvasElement[] = [];
  let rowWindows: HTMLCanvasElement[] = [];
  let flickerWins: { x: number; y: number; warm: boolean; row: number }[] = [];
  const groundBake = memoCanvas();
  const wetBake = memoCanvas();
  let carSprites: { red: HTMLCanvasElement; amber: HTMLCanvasElement } | null = null;

  const bakeRows = (w: number, h: number) => {
    const horizon = h * 0.82;
    rowBodies = [];
    rowWindows = [];
    flickerWins = [];
    for (let row = 0; row < 2; row++) {
      const bodies = makeCanvas(w, h);
      const wins = makeCanvas(w, h);
      const bg = bodies.getContext("2d")!;
      const wg = wins.getContext("2d")!;
      for (const b of buildings) {
        if (b.row !== row) continue;
        const baseY = horizon - b.h + (b.row === 1 ? 6 : 0);
        bg.fillStyle = b.row === 0 ? "rgba(6, 9, 16, 0.9)" : "rgba(9, 13, 22, 0.95)";
        bg.fillRect(b.x, baseY, b.w, b.h + 40);
        for (const win of b.windows) {
          if (win.on > 0.94) {
            flickerWins.push({ x: b.x + win.x, y: baseY + win.y, warm: win.warm, row });
            continue;
          }
          wg.fillStyle = win.warm ? "#d9a05b" : "#9db4d6";
          wg.fillRect(b.x + win.x, baseY + win.y, 3.4, 4.6);
        }
      }
      rowBodies.push(bodies);
      rowWindows.push(wins);
    }
  };

  const makeCarSprite = (color: string) =>
    glowSprite(12, [
      [0, color],
      [0.4, color],
      [1, "transparent"],
    ]);

  return {
    resize(w, h) {
      buildings = [];
      for (let row = 0; row < 2; row++) {
        let x = -20;
        while (x < w + 20) {
          const bw = 34 + rng() * 90;
          const bh = h * (row === 0 ? 0.1 + rng() * 0.16 : 0.06 + rng() * 0.1);
          const b: Building = { x, w: bw, h: bh, row, windows: [] };
          const cols = Math.floor(bw / 11);
          const rows = Math.floor(bh / 13);
          for (let cx = 0; cx < cols; cx++) {
            for (let cy = 0; cy < rows; cy++) {
              if (rng() < 0.32) {
                b.windows.push({
                  x: 4 + cx * 11,
                  y: 6 + cy * 13,
                  on: rng(),
                  warm: rng() < 0.72,
                });
              }
            }
          }
          buildings.push(b);
          x += bw + 2 + rng() * 10;
        }
      }
      cars = Array.from({ length: 14 }, () => ({
        x: rng() * w,
        v: (20 + rng() * 40) * (rng() < 0.5 ? 1 : -1),
        red: rng() < 0.5,
        y: rng(),
      }));
      bakeRows(w, h);
    },
    draw(ctx, s) {
      const { w, h, t, dt, env, intensity, px, depth } = s;
      if (buildings.length === 0) this.resize?.(w, h);
      if (!carSprites) carSprites = { red: makeCarSprite("#b8453a"), amber: makeCarSprite("#e0c48f") };
      const horizon = h * 0.82;
      const dim = 1 - env.weather.cloudCover * 0.25;

      // ground plane + skyline glow, baked together
      const ground = groundBake(`${w}x${h}:${intensity.toFixed(2)}`, w, h, (g, bw, bh) => {
        const bHorizon = bh * 0.82;
        const grad = g.createLinearGradient(0, bHorizon, 0, bh);
        grad.addColorStop(0, "rgba(5, 7, 12, 0.55)");
        grad.addColorStop(1, "rgba(3, 4, 8, 0.92)");
        g.fillStyle = grad;
        g.fillRect(0, bHorizon, bw, bh - bHorizon);
        const glow = g.createRadialGradient(bw * 0.5, bHorizon, 0, bw * 0.5, bHorizon, bw * 0.6);
        glow.addColorStop(0, `rgba(212, 160, 90, ${0.05 * intensity})`);
        glow.addColorStop(1, "transparent");
        g.fillStyle = glow;
        g.fillRect(0, 0, bw, bh);
      });
      ctx.drawImage(ground, 0, 0);

      // rows blitted with their parallax offsets; flicker windows drawn live
      for (let row = 0; row < 2; row++) {
        const par = px * (row === 0 ? 4 : 9) * depth;
        ctx.drawImage(rowBodies[row], par, 0);
        ctx.globalAlpha = 0.4 * intensity * dim * (row === 1 ? 1 : 0.65);
        ctx.drawImage(rowWindows[row], par, 0);
      }
      for (const fw of flickerWins) {
        const par = px * (fw.row === 0 ? 4 : 9) * depth;
        const flicker = 0.5 + 0.5 * Math.sin(t * 6 + fw.x);
        ctx.globalAlpha = 0.4 * intensity * dim * flicker * (fw.row === 1 ? 1 : 0.65);
        ctx.fillStyle = fw.warm ? "#d9a05b" : "#9db4d6";
        ctx.fillRect(fw.x + par, fw.y, 3.4, 4.6);
      }
      ctx.globalAlpha = 1;

      // distant traffic along the horizon: pre-blurred sprites
      if (!env.still) {
        for (const c of cars) {
          c.x += c.v * dt;
          if (c.x < -20) c.x = w + 20;
          if (c.x > w + 20) c.x = -20;
        }
      }
      ctx.globalAlpha = 0.5 * intensity;
      for (const c of cars) {
        const sprite = c.red ? carSprites.red : carSprites.amber;
        ctx.drawImage(sprite, c.x - 6, horizon + 4 + c.y * 5 - 6, 12, 12);
      }
      ctx.globalAlpha = 1;

      // wet street reflections when raining
      if (env.weather.kind === "rain" || env.weather.kind === "drizzle" || env.weather.isStorm) {
        const wet = wetBake(`${w}x${h}:${intensity.toFixed(2)}`, w, h - horizon, (g, bw, bh) => {
          const grad = g.createLinearGradient(0, 0, 0, bh);
          grad.addColorStop(0, `rgba(217, 160, 91, ${0.07 * intensity})`);
          grad.addColorStop(1, "transparent");
          g.fillStyle = grad;
          g.fillRect(0, 0, bw, bh);
        });
        ctx.drawImage(wet, 0, horizon);
      }
    },
  };
};

/* ------------------------------------------------------------ neon signs -- */

const NEON_COLORS = ["#c85a50", "#5f9ea8", "#c9a35a", "#7d8ec4", "#b3736f"];

interface Sign {
  x: number;
  y: number;
  w: number;
  h: number;
  c: string;
  fl: number;
  sprite: HTMLCanvasElement;
  refl: HTMLCanvasElement;
}

export const neonSigns: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let signs: Sign[] = [];

  // sign sprite: body at alpha 1, halo at the 0.16 ratio of the body alpha,
  // so a single globalAlpha of 0.5*intensity*flicker reproduces both
  const makeSign = (sw: number, sh: number, color: string) => {
    const pad = sh;
    const c = makeCanvas(sw + pad * 2, sh + pad);
    const g = c.getContext("2d")!;
    const cx = pad + sw / 2;
    const cy = pad / 2 + sh / 2;
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, sh);
    halo.addColorStop(0, color);
    halo.addColorStop(1, "transparent");
    g.globalAlpha = 0.16;
    g.fillStyle = halo;
    g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 1;
    g.fillStyle = color;
    g.fillRect(pad, pad / 2, sw, sh);
    return c;
  };

  const makeReflection = (sw: number, sh: number, color: string) => {
    const c = makeCanvas(sw + 4, sh * 0.8);
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "transparent");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  };

  return {
    resize(w, h) {
      signs = Array.from({ length: Math.round(w / 130) }, () => {
        const sw = 8 + rng() * 14;
        const sh = 40 + rng() * 90;
        const c = NEON_COLORS[Math.floor(rng() * NEON_COLORS.length)];
        return {
          x: rng() * w,
          y: h * (0.3 + rng() * 0.35),
          w: sw,
          h: sh,
          c,
          fl: rng(),
          sprite: makeSign(sw, sh, c),
          refl: makeReflection(sw, sh, c),
        };
      });
    },
    draw(ctx, s) {
      const { w, h, t, intensity, px } = s;
      if (signs.length === 0) this.resize?.(w, h);
      const ry = h * 0.86;
      for (const sign of signs) {
        const flicker = sign.fl > 0.8 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 9 + sign.x)) : 1;
        const x = sign.x + px * 8;
        ctx.globalAlpha = 0.5 * intensity * flicker;
        ctx.drawImage(sign.sprite, x - sign.h, sign.y - sign.h / 2);
        ctx.globalAlpha = 0.1 * intensity * flicker;
        ctx.drawImage(sign.refl, x - 2, ry);
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ---------------------------------------------------------------- embers -- */

export const embers: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let sparks: { x: number; y: number; vy: number; life: number; max: number }[] = [];
  let glow: HTMLCanvasElement | null = null;
  let sparkSprite: HTMLCanvasElement | null = null;

  return {
    resize(w, h) {
      sparks = Array.from({ length: 12 }, () => ({
        x: 0, y: h + 10, vy: 0, life: 0, max: 1,
      }));
    },
    draw(ctx, s) {
      const { w, h, t, dt, intensity, env } = s;
      if (!glow) {
        // candle glow: stops keep the 0.16 / 0.06 ratio of the original
        glow = glowSprite(256, [
          [0, "rgba(226, 168, 92, 1)"],
          [0.5, "rgba(190, 120, 60, 0.375)"],
          [1, "transparent"],
        ]);
      }
      if (!sparkSprite) sparkSprite = dotSprite("#e8b072");
      // candle glow anchored low-left, breathing slowly
      const breathe = 0.9 + 0.1 * Math.sin(t * 0.9) + 0.03 * Math.sin(t * 7.3);
      const gx = w * 0.12;
      const gy = h * 0.88;
      const r = h * 0.45 * breathe;
      ctx.globalAlpha = 0.16 * intensity;
      ctx.drawImage(glow, gx - r, gy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;

      if (env.still) return;
      if (sparks.length === 0) this.resize?.(w, h);
      const rate = intensity * env.quality;
      for (const sp of sparks) {
        sp.life -= dt;
        if (sp.life <= 0 && rng() < 0.01 * rate * 60 * dt) {
          sp.x = gx + (rng() - 0.5) * 30;
          sp.y = gy;
          sp.vy = -(14 + rng() * 26);
          sp.max = 2 + rng() * 3;
          sp.life = sp.max;
        }
        if (sp.life > 0) {
          sp.y += sp.vy * dt;
          sp.x += Math.sin(t * 3 + sp.y * 0.06) * 0.3;
          ctx.globalAlpha = (sp.life / sp.max) * 0.5 * intensity;
          ctx.drawImage(sparkSprite, sp.x - 1.1, sp.y - 1.1, 2.2, 2.2);
        }
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ---------------------------------------------------------------- clouds -- */

export const clouds: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let puffs: { x: number; y: number; rx: number; ry: number; v: number; a: number }[] = [];
  let sprite: HTMLCanvasElement | null = null;

  return {
    resize(w, h) {
      puffs = Array.from({ length: 7 }, () => ({
        x: rng() * w,
        y: h * (0.05 + rng() * 0.3),
        rx: w * (0.18 + rng() * 0.2),
        ry: 24 + rng() * 44,
        v: 2.5 + rng() * 5,
        a: 0.4 + rng() * 0.6,
      }));
    },
    draw(ctx, s) {
      const { w, h, dt, env, intensity } = s;
      if (!sprite) {
        sprite = glowSprite(256, [
          [0, "rgba(150, 165, 195, 1)"],
          [1, "transparent"],
        ]);
      }
      if (puffs.length === 0) this.resize?.(w, h);
      const cover = Math.max(0.15, env.weather.cloudCover);
      for (const p of puffs) {
        if (!env.still) p.x += p.v * dt;
        if (p.x - p.rx > w) p.x = -p.rx;
        ctx.globalAlpha = 0.07 * intensity * cover * p.a;
        ctx.drawImage(sprite, p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* -------------------------------------------------------------- branches -- */

export const branches: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  const arms = Array.from({ length: 5 }, (_, i) => ({
    side: i % 2,
    y: 0.1 + rng() * 0.5,
    len: 0.22 + rng() * 0.2,
    droop: 30 + rng() * 60,
    ph: rng() * TAU,
    segs: 3 + Math.floor(rng() * 3),
  }));

  return {
    draw(ctx, s) {
      const { w, h, t, intensity, px } = s;
      ctx.strokeStyle = "rgba(8, 14, 10, 0.85)";
      ctx.lineCap = "round";
      for (const a of arms) {
        const sway = Math.sin(t * 0.4 + a.ph) * 3 + px * 5;
        const x0 = a.side === 0 ? -10 : w + 10;
        const dir = a.side === 0 ? 1 : -1;
        const y0 = h * a.y;
        ctx.globalAlpha = intensity;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        let x = x0;
        let y = y0;
        for (let seg = 0; seg < a.segs; seg++) {
          const nx = x + dir * w * (a.len / a.segs);
          const ny = y + a.droop / a.segs + Math.sin(t * 0.4 + a.ph + seg) * 2;
          ctx.quadraticCurveTo(x + dir * 30, y + 10 + sway * 0.4, nx, ny + sway);
          x = nx;
          y = ny;
          ctx.lineWidth = Math.max(1.5, 7 - seg * 2);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ----------------------------------------------------------------- moon -- */

export const moon: EffectFactory = () => {
  const baked = memoCanvas();

  return {
    draw(ctx, s) {
      const { w, h, env, intensity, px, py } = s;
      const x = w * 0.76 + px * 3;
      const y = h * 0.16 + py * 2;
      const r = Math.min(w, h) * 0.035;
      const bright = intensity * (1 - env.weather.cloudCover * 0.7);
      if (bright <= 0.02) return;

      // disc + phase shadow + halo baked; phase quantized to 20 steps
      const phaseStep = Math.round(env.moonPhase * 20);
      const size = r * 12;
      const sprite = baked(`${Math.round(r)}:${phaseStep}`, size, size, (g, bw) => {
        const c = bw / 2;
        const halo = g.createRadialGradient(c, c, r * 0.4, c, c, r * 6);
        halo.addColorStop(0, "rgba(220, 230, 245, 0.144)");
        halo.addColorStop(1, "transparent");
        g.fillStyle = halo;
        g.fillRect(0, 0, bw, bw);
        g.fillStyle = "#e6ecf6";
        g.beginPath();
        g.arc(c, c, r, 0, TAU);
        g.fill();
        const ph = phaseStep / 20;
        if (ph < 0.97) {
          g.fillStyle = "rgba(8, 12, 22, 0.92)";
          g.beginPath();
          const off = (1 - ph) * r * 2.1;
          g.arc(c - off * 0.6, c - off * 0.15, r * 1.02, 0, TAU);
          g.fill();
        }
      });
      ctx.globalAlpha = 0.9 * bright;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = 1;
    },
  };
};

/* ------------------------------------------------------------- lamp glow -- */

export const lampGlow: EffectFactory = () => {
  const roomBake = memoCanvas();
  let pool: HTMLCanvasElement | null = null;

  return {
    draw(ctx, s) {
      const { w, h, t, intensity } = s;
      if (!pool) {
        // lamp stops keep the original 0.2 / 0.08 ratio
        pool = glowSprite(256, [
          [0, "rgba(227, 181, 119, 1)"],
          [0.4, "rgba(200, 140, 80, 0.4)"],
          [1, "transparent"],
        ]);
      }

      // static room: window frame, sill, vignette, desk, plant stem
      const room = roomBake(`${w}x${h}`, w, h, (g, bw, bh) => {
        g.fillStyle = "rgba(9, 6, 4, 0.88)";
        const frameW = Math.max(10, bw * 0.012);
        g.fillRect(bw * 0.333 - frameW / 2, 0, frameW, bh * 0.97);
        g.fillRect(bw * 0.667 - frameW / 2, 0, frameW, bh * 0.97);
        g.fillRect(0, bh * 0.955, bw, bh * 0.02);
        const vg = g.createRadialGradient(
          bw * 0.5, bh * 0.45, bh * 0.3,
          bw * 0.5, bh * 0.5, Math.max(bw, bh) * 0.75,
        );
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, "rgba(10, 6, 3, 0.55)");
        g.fillStyle = vg;
        g.fillRect(0, 0, bw, bh);
        g.fillStyle = "rgba(10, 7, 5, 0.55)";
        g.fillRect(0, bh * 0.965, bw, bh * 0.035);
        g.fillRect(bw * 0.04, bh * 0.965 - 36, 3, 36); // plant stem hint
      });
      ctx.drawImage(room, 0, 0);

      // desk lamp pool, bottom right; breathing very slowly
      const breathe = 0.96 + 0.04 * Math.sin(t * 0.5);
      const x = w * 0.85;
      const y = h * 0.9;
      const r = h * 0.7 * breathe;
      ctx.globalAlpha = 0.2 * intensity;
      ctx.drawImage(pool, x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;

      // plant leaves: three soft arcs, swaying live
      ctx.strokeStyle = "rgba(12, 16, 10, 0.6)";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const sway = Math.sin(t * 0.4 + i) * 1.6;
        ctx.beginPath();
        ctx.moveTo(w * 0.04 + 1, h * 0.965 - 30);
        ctx.quadraticCurveTo(
          w * 0.04 + (i - 1) * 26 + sway,
          h * 0.965 - 62,
          w * 0.04 + (i - 1) * 40 + sway,
          h * 0.965 - 78 + i * 6,
        );
        ctx.stroke();
      }
    },
  };
};

/* ---------------------------------------------------------------- aurora -- */

const AURORA_COLORS = ["#3ddc97", "#4fb8c9", "#7d8ec4"];

export const aurora: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  const ribbons = AURORA_COLORS.map((c, i) => ({
    color: c,
    x: 0.15 + i * 0.28 + rng() * 0.1,
    ph: rng() * TAU,
    speed: 0.05 + rng() * 0.04,
    sprite: null as HTMLCanvasElement | null,
  }));

  const makeRibbon = (color: string) => {
    const c = makeCanvas(220, 512);
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.25, color);
    grad.addColorStop(0.8, "transparent");
    g.fillStyle = grad;
    // soft-edged column
    const xg = g.createLinearGradient(0, 0, 220, 0);
    xg.addColorStop(0, "transparent");
    xg.addColorStop(0.5, color);
    xg.addColorStop(1, "transparent");
    g.fillStyle = xg;
    g.globalCompositeOperation = "source-over";
    g.fillRect(0, 0, 220, 512);
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = grad;
    g.fillRect(0, 0, 220, 512);
    return c;
  };

  return {
    draw(ctx, s) {
      const { w, h, t, intensity, px } = s;
      ctx.globalCompositeOperation = "screen";
      for (const r of ribbons) {
        if (!r.sprite) r.sprite = makeRibbon(r.color);
        const sway = Math.sin(t * r.speed * TAU + r.ph);
        const x = w * r.x + sway * w * 0.05 + px * 18;
        const skew = Math.sin(t * r.speed * TAU * 0.7 + r.ph) * 0.22;
        const alpha = intensity * (0.16 + 0.08 * Math.sin(t * 0.11 + r.ph));
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(x, 0);
        ctx.transform(1, 0, skew, 1, 0, 0);
        ctx.drawImage(r.sprite, -110, -h * 0.06, 260, h * 0.85);
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },
  };
};

/* ------------------------------------------------------------- fireflies -- */

export const fireflies: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let flies: { x: number; y: number; vx: number; vy: number; ph: number }[] = [];
  let sprite: HTMLCanvasElement | null = null;

  return {
    resize(w, h) {
      flies = Array.from({ length: 18 }, () => ({
        x: rng() * w,
        y: h * (0.45 + rng() * 0.5),
        vx: (rng() - 0.5) * 12,
        vy: (rng() - 0.5) * 6,
        ph: rng() * TAU,
      }));
    },
    draw(ctx, s) {
      const { w, h, t, dt, intensity, env } = s;
      if (!sprite) {
        sprite = glowSprite(24, [
          [0, "rgba(240, 224, 150, 1)"],
          [0.3, "rgba(214, 190, 108, 0.5)"],
          [1, "transparent"],
        ]);
      }
      if (flies.length === 0) this.resize?.(w, h);
      const count = Math.round(flies.length * intensity * env.quality);
      for (let i = 0; i < count; i++) {
        const f = flies[i];
        if (!env.still) {
          f.vx += (rng() - 0.5) * 8 * dt;
          f.vy += (rng() - 0.5) * 5 * dt;
          f.vx = Math.max(-16, Math.min(16, f.vx));
          f.vy = Math.max(-9, Math.min(9, f.vy));
          f.x += f.vx * dt;
          f.y += f.vy * dt;
        }
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;
        if (f.y < h * 0.35) f.y = h * 0.35;
        if (f.y > h + 10) f.y = h * 0.6;
        // slow pulse with occasional dark gaps
        const pulse = Math.max(0, Math.sin(f.ph + t * 1.1));
        ctx.globalAlpha = intensity * pulse * 0.8;
        ctx.drawImage(sprite, f.x - 5, f.y - 5, 10, 10);
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ------------------------------------------------------- falling petals -- */

function petalSprite(colors: string[]): HTMLCanvasElement[] {
  return colors.map((color) => {
    const c = makeCanvas(24, 24);
    const g = c.getContext("2d")!;
    g.fillStyle = color;
    g.beginPath();
    // teardrop petal
    g.moveTo(12, 3);
    g.bezierCurveTo(19, 7, 20, 16, 12, 21);
    g.bezierCurveTo(4, 16, 5, 7, 12, 3);
    g.closePath();
    g.fill();
    return c;
  });
}

function fallingPetals(colors: string[], drift: number): EffectFactory {
  return (seed) => {
    const rng = mulberry32(seed);
    let petals: {
      x: number; y: number; sp: number; sw: number; ph: number; rot: number;
      vr: number; size: number; variant: number;
    }[] = [];
    let sprites: HTMLCanvasElement[] | null = null;

    return {
      resize(w, h) {
        petals = Array.from({ length: Math.round(w / 34) }, () => ({
          x: rng() * w,
          y: rng() * h,
          sp: 22 + rng() * 30,
          sw: 14 + rng() * 26,
          ph: rng() * TAU,
          rot: rng() * TAU,
          vr: (rng() - 0.5) * 2.2,
          size: 6 + rng() * 8,
          variant: Math.floor(rng() * colors.length),
        }));
      },
      draw(ctx, s) {
        const { w, h, t, dt, intensity, env, px } = s;
        if (!sprites) sprites = petalSprite(colors);
        if (petals.length === 0) this.resize?.(w, h);
        const count = Math.round(petals.length * intensity * env.quality);
        for (let i = 0; i < count; i++) {
          const p = petals[i];
          if (!env.still) {
            p.y += p.sp * dt;
            p.rot += p.vr * dt;
          }
          const x = p.x + Math.sin(p.ph + t * 0.6) * p.sw + drift * t * 4 + px * 12;
          const wrapped = ((x % (w + 40)) + w + 40) % (w + 40) - 20;
          if (p.y > h + 12) {
            p.y = -12;
            p.x = rng() * w;
          }
          ctx.save();
          ctx.translate(wrapped, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = 0.5 * intensity;
          const sp = sprites[p.variant];
          ctx.drawImage(sp, -p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      },
    };
  };
}

export const leaves = fallingPetals(["#a8663a", "#8a5a2e", "#b4854e"], 1.6);
export const sakura = fallingPetals(["#e6b7c4", "#d99cae", "#f0cdd6"], 0.9);

/* ------------------------------------------------------------- lightning -- */

export const lightning: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let bolt: { pts: [number, number][]; life: number } | null = null;
  let next = 6 + rng() * 14;

  return {
    draw(ctx, s) {
      const { w, h, dt, intensity, env } = s;
      if (env.still) return;
      next -= dt;
      if (!bolt && next <= 0) {
        const pts: [number, number][] = [];
        let x = w * (0.2 + rng() * 0.6);
        let y = 0;
        while (y < h * 0.7) {
          pts.push([x, y]);
          x += (rng() - 0.5) * 70;
          y += 20 + rng() * 45;
        }
        bolt = { pts, life: 0.35 };
        next = 7 + rng() * 16;
      }
      if (bolt) {
        bolt.life -= dt;
        const a = Math.max(0, bolt.life / 0.35);
        // sky flash
        ctx.globalAlpha = a * 0.16 * intensity;
        ctx.fillStyle = "#cdd8ee";
        ctx.fillRect(0, 0, w, h);
        // the bolt itself, bright core over soft halo
        ctx.globalAlpha = a * intensity;
        for (const [width, color] of [
          [5, "rgba(160, 190, 255, 0.35)"],
          [1.6, "#eef3ff"],
        ] as const) {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineJoin = "round";
          ctx.beginPath();
          for (let i = 0; i < bolt.pts.length; i++) {
            const [bx, by] = bolt.pts[i];
            if (i === 0) ctx.moveTo(bx, by);
            else ctx.lineTo(bx, by);
          }
          ctx.stroke();
        }
        if (bolt.life <= 0) bolt = null;
        ctx.globalAlpha = 1;
      }
    },
  };
};

/* ----------------------------------------------------------------- waves -- */

export const waves: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  const phases = Array.from({ length: 3 }, () => rng() * TAU);

  return {
    draw(ctx, s) {
      const { w, h, t, intensity, env } = s;
      const bands = env.quality > 0.7 ? 3 : 2;
      for (let b = 0; b < bands; b++) {
        const y0 = h * (0.78 + b * 0.07);
        ctx.beginPath();
        ctx.moveTo(-10, h + 10);
        for (let x = -10; x <= w + 10; x += 14) {
          const y =
            y0 +
            Math.sin(x * 0.008 + t * (0.3 + b * 0.12) + phases[b]) * 9 +
            Math.sin(x * 0.021 - t * 0.22 + phases[b] * 2) * 5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w + 10, h + 10);
        ctx.closePath();
        ctx.globalAlpha = intensity * (0.16 - b * 0.035);
        ctx.fillStyle = b === 0 ? "#1d4a4f" : b === 1 ? "#153a40" : "#0e2b31";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* ------------------------------------------------------------ light rays -- */

export const lightRays: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  const phases = Array.from({ length: 3 }, () => rng() * TAU);
  const bake = memoCanvas();

  return {
    draw(ctx, s) {
      const { w, h, t, intensity } = s;
      const ray = bake(`${w}x${h}`, w * 0.4, h, (g, bw, bh) => {
        const grad = g.createLinearGradient(bw * 0.3, 0, bw * 0.55, bh);
        grad.addColorStop(0, "rgba(232, 210, 160, 0.10)");
        grad.addColorStop(1, "transparent");
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(bw * 0.25, 0);
        g.lineTo(bw * 0.45, 0);
        g.lineTo(bw * 0.85, bh);
        g.lineTo(bw * 0.05, bh);
        g.closePath();
        g.fill();
      });
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 3; i++) {
        const drift = Math.sin(t * 0.04 + phases[i]) * w * 0.04;
        ctx.globalAlpha = intensity * (0.5 + 0.3 * Math.sin(t * 0.07 + phases[i]));
        ctx.drawImage(ray, w * (0.1 + i * 0.28) + drift, 0);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },
  };
};

/* ----------------------------------------------------------------- grain -- */

export const grain: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  let tiles: HTMLCanvasElement[] = [];
  let frame = 0;

  const makeTiles = () => {
    tiles = Array.from({ length: 3 }, () => {
      const c = makeCanvas(192, 192);
      const g = c.getContext("2d")!;
      const img = g.createImageData(192, 192);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + (rng() - 0.5) * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 22;
      }
      g.putImageData(img, 0, 0);
      return c;
    });
  };

  return {
    draw(ctx, s) {
      const { w, h, intensity, env } = s;
      if (tiles.length === 0) makeTiles();
      if (!env.still) frame = (frame + 1) % 3;
      const tile = tiles[frame];
      ctx.globalAlpha = intensity;
      ctx.globalCompositeOperation = "overlay";
      for (let y = 0; y < h; y += 192) {
        for (let x = 0; x < w; x += 192) {
          ctx.drawImage(tile, x, y);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },
  };
};

/* ----------------------------------------------------------------- dunes -- */

export const dunes: EffectFactory = (seed) => {
  const rng = mulberry32(seed);
  const bake = memoCanvas();
  const offsets = [rng() * TAU, rng() * TAU];

  return {
    draw(ctx, s) {
      const { w, h, intensity, px } = s;
      const layer = bake(`${w}x${h}`, w + 80, h, (g, bw, bh) => {
        const rows: [number, string][] = [
          [0.78, "rgba(24, 18, 26, 0.85)"],
          [0.86, "rgba(15, 11, 17, 0.95)"],
        ];
        rows.forEach(([base, color], i) => {
          g.beginPath();
          g.moveTo(0, bh);
          for (let x = 0; x <= bw; x += 12) {
            const y =
              bh * base +
              Math.sin(x * 0.004 + offsets[i]) * bh * 0.035 +
              Math.sin(x * 0.011 + offsets[i] * 2) * bh * 0.012;
            g.lineTo(x, y);
          }
          g.lineTo(bw, bh);
          g.closePath();
          g.fillStyle = color;
          g.fill();
        });
      });
      ctx.globalAlpha = intensity;
      ctx.drawImage(layer, -40 + px * 6, 0);
      ctx.globalAlpha = 1;
    },
  };
};

/* ---------------------------------------------------------------- export -- */

export const EFFECTS: Record<string, EffectFactory> = {
  "sky-gradient": skyGradient,
  rain,
  droplets,
  fog,
  stars,
  "shooting-stars": shootingStars,
  snow,
  dust,
  caustics,
  "city-lights": cityLights,
  "neon-signs": neonSigns,
  embers,
  clouds,
  branches,
  moon,
  "lamp-glow": lampGlow,
  aurora,
  fireflies,
  leaves,
  sakura,
  lightning,
  waves,
  "light-rays": lightRays,
  grain,
  dunes,
};
