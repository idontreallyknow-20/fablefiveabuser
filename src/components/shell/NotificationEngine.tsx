"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { localDb } from "@/lib/local/client";
import { useSettings } from "@/lib/settings/store";
import { useRoutines, useRoutineLogs } from "@/lib/data/routines";
import { todayISO } from "@/lib/data/tasks";
import { useTodayAgenda } from "@/components/calendar/TodayEvents";

function inQuietHours(now: Date, start: string, end: string): boolean {
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return start <= end ? hhmm >= start && hhmm < end : hhmm >= start || hhmm < end;
}

/**
 * Local notification scheduler: fires calm reminders for due routines and
 * scheduled tasks while Orbit is open. Respects the device
 * permission, per-category preferences, and quiet hours. Every notification
 * is also written to the history in Space.
 */
export function NotificationEngine() {
  const settings = useSettings((s) => s.settings);
  const { data: routines = [] } = useRoutines();
  const date = todayISO();
  const { data: logs = [] } = useRoutineLogs(date);
  const { items: agenda } = useTodayAgenda();
  const fired = useRef<Set<string>>(new Set());

  const { data: prefs = [] } = useQuery({
    queryKey: ["notification_prefs"],
    queryFn: async () => {
      const { data } = await localDb().from("notification_prefs").select("*");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const tick = async () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const now = new Date();
      if (settings.quietHours.enabled && inQuietHours(now, settings.quietHours.start, settings.quietHours.end)) {
        return;
      }
      const enabled = new Map(prefs.map((p) => [p.category, p.enabled]));
      const supabase = localDb();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const send = async (key: string, category: string, title: string, body: string) => {
        if (fired.current.has(key)) return;
        if (enabled.get(category) === false) return;
        fired.current.add(key);
        try {
          new Notification(title, { body, silent: true, icon: "/icons/icon-192.png" });
        } catch {
          return;
        }
        await supabase.from("notification_log").insert({ user_id: user.id, category, title, body });
      };

      // routines due at this minute
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const day = now.getDay();
      const logged = new Set(logs.map((l) => l.routine_id));
      for (const r of routines) {
        if (!r.enabled || logged.has(r.id)) continue;
        const sched = r.schedule as { times?: string[]; days?: number[] };
        if (sched.days && !sched.days.includes(day)) continue;
        if ((sched.times ?? []).includes(hhmm)) {
          const category =
            r.category === "skincare" ? "skincare" : r.category === "reflect" ? "checkins" : "resets";
          await send(`routine-${r.id}-${date}-${hhmm}`, category, r.name, "When you have a minute.");
        }
      }

      // scheduled tasks starting in ten minutes
      const nowMin = now.getHours() * 60 + now.getMinutes();
      for (const e of agenda) {
        if (e.kind !== "task" || !e.time) continue;
        const [h, m] = e.time.split(":").map(Number);
        if (h * 60 + m - nowMin === 10) {
          await send(`event-${e.id}-${date}`, "calendar", e.title, "Starts in ten minutes.");
        }
      }
    };
    const iv = setInterval(tick, 60_000);
    tick();
    return () => clearInterval(iv);
  }, [routines, logs, prefs, agenda, settings.quietHours, date]);

  return null;
}
