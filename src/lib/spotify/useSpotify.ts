"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { extractMutedColor, useGlowStore } from "@/lib/spotify/glow";

export interface SpotifyAccount {
  id: string;
  label: string;
  external_id: string;
  email: string;
  is_active: boolean;
  meta: Record<string, unknown>;
}

export interface SpotifyStatus {
  configured: boolean;
  connected: boolean;
  accounts?: SpotifyAccount[];
  missing?: { clientId: boolean; clientSecret: boolean; serviceRole: boolean };
}

export function useSpotifyStatus() {
  return useQuery<SpotifyStatus>({
    queryKey: ["spotify", "status"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/status");
      if (!res.ok) throw new Error("status failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export interface SpotifyTrack {
  name: string;
  artists: string;
  albumArt: string | null;
  durationMs: number;
  uri: string;
}

export interface SpotifyPlaybackState {
  track: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  deviceName: string | null;
  volume: number | null;
  canControl: boolean;
  error: string | null;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;
  refresh: () => void;
}

/**
 * Polls current playback through the server (which holds the tokens) and
 * exposes control actions. The Web Playback SDK device is registered
 * separately by <WebPlayer/> so this hook works for any active device.
 */
export function useSpotifyPlayback(enabled: boolean): SpotifyPlaybackState {
  const qc = useQueryClient();
  const setGlow = useGlowStore((s) => s.setColor);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["spotify", "playback"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/playback");
      if (res.status === 204) return null;
      if (!res.ok) throw new Error("playback failed");
      return res.json() as Promise<{
        track: SpotifyTrack | null;
        isPlaying: boolean;
        progressMs: number;
        deviceName: string | null;
        volume: number | null;
      }>;
    },
    enabled,
    // no polling while the tab is hidden
    refetchInterval: () => (typeof document !== "undefined" && document.hidden ? false : 5000),
    retry: false,
  });

  // publish album glow
  useEffect(() => {
    let cancelled = false;
    if (data?.track?.albumArt) {
      extractMutedColor(data.track.albumArt).then((c) => {
        if (!cancelled) setGlow(c);
      });
    } else {
      setGlow(null);
    }
    return () => {
      cancelled = true;
    };
  }, [data?.track?.albumArt, setGlow]);

  const command = useCallback(
    async (action: string, body?: Record<string, unknown>) => {
      setError(null);
      try {
        const res = await fetch(`/api/spotify/control`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, ...body }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Playback control failed");
        }
        setTimeout(() => qc.invalidateQueries({ queryKey: ["spotify", "playback"] }), 350);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Playback control failed");
      }
    },
    [qc],
  );

  return {
    track: data?.track ?? null,
    isPlaying: data?.isPlaying ?? false,
    progressMs: data?.progressMs ?? 0,
    deviceName: data?.deviceName ?? null,
    volume: data?.volume ?? null,
    canControl: enabled && Boolean(data),
    error,
    play: () => command("play"),
    pause: () => command("pause"),
    next: () => command("next"),
    previous: () => command("previous"),
    setVolume: (v: number) => command("volume", { volume: v }),
    refresh: () => qc.invalidateQueries({ queryKey: ["spotify", "playback"] }),
  };
}
