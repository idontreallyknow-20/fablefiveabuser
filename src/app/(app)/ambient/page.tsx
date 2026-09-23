"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "@/components/today/Clock";
import { WeatherChip } from "@/components/today/WeatherChip";
import { todayISO, usePriorities } from "@/lib/data/tasks";
import { useRoutines, useRoutineLogs } from "@/lib/data/routines";
import { useTodayAgenda, nextItemOf } from "@/components/calendar/TodayEvents";
import { useSettings } from "@/lib/settings/store";

/** requests a screen wake lock while mounted, when enabled and supported */
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let released = false;
    const acquire = async () => {
      try {
        lock = await (navigator as Navigator & {
          wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        }).wakeLock.request("screen");
      } catch {
        // low battery or unsupported; ambient still works
      }
    };
    acquire();
    const onVis = () => {
      if (!document.hidden && !released) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}

export default function AmbientPage() {
  const router = useRouter();
  const settings = useSettings((s) => s.settings);
  const date = todayISO();
  const { data: priorities = [] } = usePriorities(date);
  const { items: agenda } = useTodayAgenda();
  const { data: routines = [] } = useRoutines();
  const { data: routineLogs = [] } = useRoutineLogs(date);

  const [controlsVisible, setControlsVisible] = useState(false);
  const [drift, setDrift] = useState({ x: 0, y: 0 });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useWakeLock(settings.ambient.wakeLock);

  // burn-in protection: shift the composition a few pixels every 2 minutes
  useEffect(() => {
    if (!settings.ambient.burnInProtection) return;
    const id = setInterval(() => {
      setDrift({ x: Math.round(Math.random() * 16 - 8), y: Math.round(Math.random() * 12 - 6) });
    }, 120_000);
    return () => clearInterval(id);
  }, [settings.ambient.burnInProtection]);

  // reveal controls on activity, hide after 3s idle
  const poke = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3200);
  }, []);

  useEffect(() => {
    const events = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/today");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      events.forEach((e) => window.removeEventListener(e, poke));
      window.removeEventListener("keydown", onKey);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [poke, router]);

  // late-night dimming
  const hour = new Date().getHours();
  const nightDim = settings.ambient.nightDimming && (hour >= 23 || hour < 6) ? 0.82 : 1;

  // routines surface as the reminder below, so only scheduled tasks here
  const nextEvent = nextItemOf(agenda.filter((i) => i.kind === "task"));
  const openPriorities = priorities.filter((t) => !t.completed_at);

  // one subtle relevant reminder: the next routine due within the hour
  const reminder = (() => {
    if (!settings.ambient.showReminder) return null;
    const logged = new Set(routineLogs.map((l) => l.routine_id));
    const now = new Date();
    const day = now.getDay();
    const soon = new Date(now.getTime() + 60 * 60 * 1000);
    for (const r of routines) {
      if (!r.enabled || logged.has(r.id)) continue;
      const sched = r.schedule as { times?: string[]; days?: number[] };
      if (sched.days && !sched.days.includes(day)) continue;
      for (const t of sched.times ?? []) {
        const [h, m] = t.split(":").map(Number);
        const at = new Date(now);
        at.setHours(h, m, 0, 0);
        if (at >= now && at <= soon) return { name: r.name, at: t };
      }
    }
    return null;
  })();

  return (
    <main
      className="fixed inset-0 z-10 flex cursor-default flex-col items-center justify-center"
      style={{ filter: `brightness(${nightDim})` }}
      onDoubleClick={() => router.push("/today")}
    >
      <h1 className="sr-only">Ambient</h1>
      <div
        className="flex flex-col items-center gap-8 transition-transform duration-[3000ms] ease-linear"
        style={{ transform: `translate(${drift.x}px, ${drift.y}px)` }}
      >
        <Clock
          size="ambient"
          meta={
            <>
              <span aria-hidden className="text-ink-faint">·</span>
              <WeatherChip />
              {nextEvent?.time && (
                <>
                  <span aria-hidden className="text-ink-faint">·</span>
                  <span className="tnum">
                    {nextEvent.time} {nextEvent.title}
                  </span>
                </>
              )}
            </>
          }
        />

        {openPriorities.length > 0 && (
          <ol className="flex flex-col items-center gap-1.5">
            {openPriorities.slice(0, 3).map((t) => (
              <li key={t.id} className="text-[15px] text-ink-faint">
                {t.title}
              </li>
            ))}
          </ol>
        )}

        {reminder && (
          <p className="tnum font-mono text-[12px] text-ink-faint/80">
            {reminder.at} · {reminder.name}
          </p>
        )}
      </div>

      {/* controls: hidden until activity */}
      <div
        className={`fixed inset-x-0 bottom-8 flex justify-center gap-2 transition-opacity duration-[var(--dur-slow)] ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          onClick={() => router.push("/today")}
          className="floating rounded-full px-5 py-2.5 text-sm text-ink-dim transition-colors hover:text-ink"
        >
          Back to dashboard
        </button>
        <button
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(() => {});
          }}
          className="floating rounded-full px-5 py-2.5 text-sm text-ink-dim transition-colors hover:text-ink"
        >
          Full screen
        </button>
      </div>
    </main>
  );
}
