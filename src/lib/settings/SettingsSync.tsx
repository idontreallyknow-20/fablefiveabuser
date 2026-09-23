"use client";

import { useEffect, useRef } from "react";
import { localDb } from "@/lib/local/client";
import {
  applySettingsToDocument,
  normalizeSettings,
  useSettings,
  type OrbitSettings,
} from "@/lib/settings/store";

/**
 * Keeps settings alive in three places: zustand (runtime), localStorage
 * (instant restore), and profiles.settings (so backups carry them). Local wins until
 * the profile copy loads; afterwards edits are written back, debounced.
 */
export function SettingsSync() {
  const { settings, hydratedFromProfile, replaceAll, markProfileHydrated } =
    useSettings();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  // apply to document on every change
  useEffect(() => {
    applySettingsToDocument(settings);
  }, [settings]);

  // initial load from profile
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = localDb();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const remote = (data?.settings ?? null) as
        | (Partial<OrbitSettings> & { _savedAt?: string })
        | null;
      if (remote && typeof remote === "object" && "theme" in remote) {
        // newest copy wins: adopt the profile only when it is newer than
        // the last local edit; otherwise keep local and push it up
        const localModifiedAt = (() => {
          try {
            return JSON.parse(
              localStorage.getItem("orbit-settings-modified-at") ?? "null",
            ) as string | null;
          } catch {
            return null;
          }
        })();
        if (!localModifiedAt || (remote._savedAt && remote._savedAt > localModifiedAt)) {
          skipNextSave.current = true;
          replaceAll(normalizeSettings(remote));
        } else {
          skipNextSave.current = false;
        }
      }
      markProfileHydrated();
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceAll, markProfileHydrated]);

  // debounced write-back after profile hydration
  useEffect(() => {
    if (!hydratedFromProfile) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const supabase = localDb();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const savedAt = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({
          settings: { ...JSON.parse(JSON.stringify(settings)), _savedAt: savedAt },
        })
        .eq("id", user.id);
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [settings, hydratedFromProfile]);

  return null;
}
