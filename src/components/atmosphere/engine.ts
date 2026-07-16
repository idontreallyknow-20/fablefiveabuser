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
  let v = layer.intensity;
  if (layer.weather && layer.weather.length > 0 && !layer.weather.includes("any")) {
    if (!layer.weather.includes(env.weather.kind)) return 0;
  }
  if (layer.phases && layer.phases.length > 0 && !layer.phases.includes(env.phase)) {
    return 0;
  }
  return v;
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private running = false;
  private start = 0;
  private last = 0;
  private px = 0;
  private py = 0;
  private targetPx = 0;
  private targetPy = 0;
  private renderers: { layer: SceneLayerConfig; r: EffectRenderer }[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
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
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const { r } of this.renderers) r.resize?.(w, h);
    if (!this.running) this.drawFrame(this.last || 0.016);
  }

  private drawFrame(dt: number) {
    const t = (performance.now() - this.start) / 1000;
    this.px += (this.targetPx - this.px) * Math.min(1, dt * 3);
    this.py += (this.targetPy - this.py) * Math.min(1, dt * 3);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const { layer, r } of this.renderers) {
      const intensity = gateIntensity(layer, this.env);
      if (intensity <= 0.001) continue;
      ctx.save();
      r.draw(ctx, {
        w: this.w,
        h: this.h,
        t,
        dt,
        px: this.px,
        py: this.py,
        env: this.env,
        intensity,
        depth: layer.depth,
        theme: this.theme,
      });
      ctx.restore();
    }
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.start = performance.now();
    this.last = this.start;
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!document.hidden) this.drawFrame(dt);
      if (this.env.still) {
        this.running = false;
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    this.renderers = [];
  }
}
