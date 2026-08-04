"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Scene, type SceneEnv, type SceneWeather } from "./engine";
import { EFFECTS } from "./effects";
import { THEMES, type ThemeId } from "@/lib/themes/registry";
import { useSettings } from "@/lib/settings/store";
import { useWeather } from "@/lib/weather/useWeather";
import { getDayPhase, getMoonIllumination, SKY_PALETTES } from "@/lib/weather/phase";
import { usePlaybackGlow } from "@/lib/spotify/glow";

const CALM_WEATHER: SceneWeather = {
  kind: "clouds",
  precipitation: 0.4,
  cloudCover: 0.55,
  visibility: 0.85,
  windKph: 10,
  isStorm: false,
};

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** conservative device check: low-power devices default to the low tier */
function detectAutoQuality(): number {
  if (typeof navigator === "undefined") return 1;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  if (cores <= 4 || mem <= 4) return 0.55;
  return 1;
}

export function AtmosphereCanvas({
  themeOverride,
  className,
  interactive = true,
}: {
  themeOverride?: ThemeId;
  className?: string;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const settings = useSettings((s) => s.settings);
  const { data: weather } = useWeather();
  const prefersReduced = usePrefersReducedMotion();
  const glowColor = usePlaybackGlow(settings.albumGlow);

  const themeId = themeOverride ?? settings.theme;
  const theme = THEMES[themeId];

  const [phaseTick, setPhaseTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhaseTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const phase = useMemo(
    () => getDayPhase(new Date(), settings.location.lat, settings.location.lon),
    // recompute every minute
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.location.lat, settings.location.lon, phaseTick],
  );

  // Living Sky: push phase palette into CSS variables so the whole interface follows
  useEffect(() => {
    if (themeId !== "living-sky") return;
    const p = SKY_PALETTES[phase];
    const root = document.documentElement;
    root.style.setProperty("--sky-bg0", p.bg0);
    root.style.setProperty("--sky-bg1", p.bg1);
    root.style.setProperty("--sky-bg2", p.bg2);
    root.style.setProperty("--sky-bg3", p.bg3);
    root.style.setProperty("--sky-accent", p.accent);
  }, [themeId, phase]);

  // destructure so the memo only reacts to the fields it actually reads,
  // not every settings write anywhere in the app
  const {
    weatherReactive,
    weatherOverride,
    phaseOverride,
    timeReactive,
    reducedMotion,
    motion,
    adaptivePerf,
  } = settings;

  const env = useMemo<SceneEnv>(() => {
    const base: SceneWeather =
      weatherReactive && weather
        ? {
            kind: weather.current.kind,
            precipitation: weather.current.precipitation + weather.current.snowfall,
            cloudCover: weather.current.cloudCover,
            visibility: weather.current.visibility,
            windKph: weather.current.windKph,
            isStorm: weather.current.isStorm,
          }
        : CALM_WEATHER;
    const w: SceneWeather = weatherOverride
      ? {
          ...base,
          kind: weatherOverride,
          isStorm: weatherOverride === "storm",
          precipitation:
            weatherOverride === "rain" || weatherOverride === "storm"
              ? Math.max(base.precipitation, 2)
              : weatherOverride === "snow"
                ? Math.max(base.precipitation, 1.5)
                : weatherOverride === "drizzle"
                  ? 0.6
                  : 0,
          cloudCover:
            weatherOverride === "clear"
              ? 0.05
              : weatherOverride === "clouds" || weatherOverride === "storm"
                ? 0.85
                : base.cloudCover,
          visibility: weatherOverride === "fog" ? 0.2 : base.visibility,
        }
      : base;
    const still = prefersReduced || reducedMotion || motion === "low";
    const quality =
      (motion === "cinematic" ? 1.5 : motion === "low" ? 0.45 : 1) *
      detectAutoQuality();
    return {
      weather: w,
      weatherLive: Boolean(weatherOverride) || (weatherReactive && Boolean(weather)),
      phase: phaseOverride ?? (timeReactive ? phase : "night"),
      moonPhase: getMoonIllumination(new Date()),
      quality,
      still,
      glowColor,
    };
  }, [weather, weatherReactive, weatherOverride, phaseOverride, timeReactive, reducedMotion, motion, phase, prefersReduced, glowColor]);

  // scene lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new Scene(canvas, theme, env, EFFECTS);
    sceneRef.current = scene;

    const parent = canvas.parentElement ?? document.body;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, env.quality > 1.2 ? 1.5 : 1.25);
      scene.resize(parent.clientWidth, parent.clientHeight, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    scene.run();

    // fully cancel the rAF loop while the tab is hidden
    const onVisibility = () => {
      if (document.hidden) scene.stop();
      else if (!scene.env.still) scene.run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      scene.destroy();
      sceneRef.current = null;
    };
    // theme identity change rebuilds the scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  // env updates without rebuild
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.adaptive = adaptivePerf;
    scene.setEnv(env);
    if (!env.still) scene.run();
  }, [env, adaptivePerf]);

  // dev frame-cost HUD, opt-in via ?perf=1
  const [hud, setHud] = useState<string | null>(null);
  useEffect(() => {
    if (!window.location.search.includes("perf=1")) return;
    const id = setInterval(() => {
      const st = sceneRef.current?.stats;
      if (st) setHud(`${st.fps.toFixed(0)}fps ${st.drawMs.toFixed(1)}ms t${st.tier}`);
    }, 500);
    return () => clearInterval(id);
  }, []);

  // pointer parallax (desktop, interactive surfaces only)
  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      sceneRef.current?.setPointer(nx, ny);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive]);

  return (
    <div
      className={className ?? "fixed inset-0 -z-10"}
      style={{ filter: `brightness(var(--ui-brightness))` }}
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {hud && (
        <div className="pointer-events-none fixed right-2 top-2 z-50 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white">
          {hud}
        </div>
      )}
      {/* theme cross-fade veil handled by parent via key change */}
    </div>
  );
}
