"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  applySettingsToDocument,
  normalizeSettings,
  useSettings,
  type OrbitSettings,
} from "@/lib/settings/store";

/**
 * Keeps settings alive in three places: zustand (runtime), localStorage
 * (instant restore), and profiles.settings (cross-device). Local wins until
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
      const supabase = supabaseBrowser();
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
        // newest copy wins so an older device can't clobber recent edits
        const localSavedAt =
          typeof window !== "undefined"
            ? (JSON.parse(localStorage.getItem("orbit-settings-saved-at") ?? "null") as
                | string
                | null)
            : null;
        if (!localSavedAt || !remote._savedAt || remote._savedAt >= localSavedAt) {
          skipNextSave.current = true;
          replaceAll(normalizeSettings(remote));
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
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const savedAt = new Date().toISOString();
      localStorage.setItem("orbit-settings-saved-at", JSON.stringify(savedAt));
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
