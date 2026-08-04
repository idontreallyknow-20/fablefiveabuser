// Orbit atmosphere engine: a single 2D canvas composited from layered,
// parallaxed effects. All implementations are original (see docs/research/
// asset-sourcing.md for the licensing rationale).

import type { DayPhase, SceneLayerConfig, ThemeDef, WeatherGate } from "@/lib/themes/registry";

export interface SceneWeather {
  kind: WeatherGate;
  /** mm/h, drives rain/snow intensity */
  precipitation: number;
  cloudCover: number; // 0..1
  visibility: number; // 0..1 (1 = clear)
  windKph: number;
  isStorm: boolean;
}

export interface SceneEnv {
  weather: SceneWeather;
  /** true when real (or overridden) weather is driving the scene */
  weatherLive: boolean;
  phase: DayPhase;
  /** moon illumination 0..1 */
  moonPhase: number;
  /** quality multiplier: low .45, balanced 1, cinematic 1.5 */
  quality: number;
  /** when true draw one static frame and stop */
  still: boolean;
  /** album-art accent for subtle music glow, or null */
  glowColor: string | null;
}

export interface EffectState {
  w: number;
  h: number;
  t: number; // seconds since start
  dt: number;
  px: number; // parallax offset -1..1
  py: number;
  env: SceneEnv;
  intensity: number; // layer intensity after gates
  depth: number;
  theme: ThemeDef;
}

export interface EffectRenderer {
  draw(ctx: CanvasRenderingContext2D, s: EffectState): void;
  resize?(w: number, h: number): void;
}

export type EffectFactory = (seed: number) => EffectRenderer;

/** deterministic rng so scenes are stable between mounts */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gateIntensity(layer: SceneLayerConfig, env: SceneEnv): number {
  const v = layer.intensity;
  if (layer.weather && layer.weather.length > 0 && !layer.weather.includes("any")) {
    if (!layer.weather.includes(env.weather.kind)) {
      // signature layers keep playing when the user opted out of live weather
      if (!(layer.signature && !env.weatherLive)) return 0;
    }
  }
  if (layer.phases && layer.phases.length > 0 && !layer.phases.includes(env.phase)) {
    return 0;
  }
  return v;
}

/** adaptive tiers: draw-cost governor steps these down on slow machines */
const TIER_DPR_CAP = [Infinity, 1.1, 1];
const TIER_QUALITY = [1, 0.65, 0.4];

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private running = false;
  private start = 0;
  private last = 0;
  private elapsedMs = 0;
  private px = 0;
  private py = 0;
  private targetPx = 0;
  private targetPy = 0;
  private renderers: { layer: SceneLayerConfig; r: EffectRenderer }[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private baseDpr = 1;
  private tier = 0;
  private costEma = 6;
  private evalIn = 2;
  private skipFrame = false;
  /** when false the governor is disabled and tier stays 0 */
  adaptive = true;
  stats = { fps: 60, drawMs: 6, tier: 0 };
  env: SceneEnv;

  constructor(
    private canvas: HTMLCanvasElement,
    private theme: ThemeDef,
    env: SceneEnv,
    private factories: Record<string, EffectFactory>,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("canvas 2d unavailable");
    this.ctx = ctx;
    this.env = env;
    this.buildRenderers();
  }

  private buildRenderers() {
    this.renderers = this.theme.layers
      .filter((layer) => this.factories[layer.effect])
      .map((layer, i) => ({
        layer,
        r: this.factories[layer.effect](i * 7919 + this.theme.id.length * 131),
      }));
  }

  setTheme(theme: ThemeDef) {
    this.theme = theme;
    this.buildRenderers();
    this.resize(this.w, this.h, this.dpr);
  }

  setEnv(env: SceneEnv) {
    this.env = env;
  }

  setPointer(nx: number, ny: number) {
    this.targetPx = nx;
    this.targetPy = ny;
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.baseDpr = dpr;
    this.dpr = Math.min(dpr, TIER_DPR_CAP[this.tier]);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const { r } of this.renderers) r.resize?.(w, h);
    if (!this.running) this.drawFrame(this.last || 0.016);
  }

  private setTier(tier: number) {
    if (tier === this.tier) return;
    this.tier = tier;
    this.stats.tier = tier;
    this.resize(this.w, this.h, this.baseDpr);
  }

  /** steps quality down when frames are expensive, back up when cheap */
  private govern(dt: number) {
    if (!this.adaptive) {
      if (this.tier !== 0) this.setTier(0);
      return;
    }
    this.evalIn -= dt;
    if (this.evalIn > 0) return;
    this.evalIn = 2;
    if (this.costEma > 9 && this.tier < 2) this.setTier(this.tier + 1);
    else if (this.costEma < 3.5 && this.tier > 0) this.setTier(this.tier - 1);
  }

  private drawFrame(dt: number) {
    const t0 = performance.now();
    const t = (t0 - this.start) / 1000;
    this.px += (this.targetPx - this.px) * Math.min(1, dt * 3);
    this.py += (this.targetPy - this.py) * Math.min(1, dt * 3);
    const scale = TIER_QUALITY[this.tier];
    const env =
      scale === 1 ? this.env : { ...this.env, quality: this.env.quality * scale };
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const { layer, r } of this.renderers) {
      const intensity = gateIntensity(layer, env);
      if (intensity <= 0.001) continue;
      ctx.save();
      r.draw(ctx, {
        w: this.w,
        h: this.h,
        t,
        dt,
        px: this.px,
        py: this.py,
        env,
        intensity,
        depth: layer.depth,
        theme: this.theme,
      });
      ctx.restore();
    }
    const cost = performance.now() - t0;
    this.costEma += (cost - this.costEma) * 0.08;
    this.stats.drawMs = this.costEma;
  }

  run() {
    if (this.running) return;
    this.running = true;
    // resume scene time where it left off so animations don't jump
    this.start = performance.now() - this.elapsedMs;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (dt > 0) this.stats.fps += (1 / dt - this.stats.fps) * 0.05;
      // lowest tier renders at half rate
      this.skipFrame = this.tier === 2 && !this.skipFrame;
      if (!this.skipFrame) {
        this.drawFrame(this.tier === 2 ? dt * 2 : dt);
        this.govern(dt);
      }
      if (this.env.still) {
        this.running = false;
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this.running) this.elapsedMs = performance.now() - this.start;
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    this.renderers = [];
  }
}
