"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  applySettingsToDocument,
  DEFAULT_SETTINGS,
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
      const remote = (data?.settings ?? null) as Partial<OrbitSettings> | null;
      if (remote && typeof remote === "object" && "theme" in remote) {
        skipNextSave.current = true;
        replaceAll({ ...DEFAULT_SETTINGS, ...remote });
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
      await supabase
        .from("profiles")
        .update({ settings: JSON.parse(JSON.stringify(settings)) })
        .eq("id", user.id);
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [settings, hydratedFromProfile]);

  return null;
}
