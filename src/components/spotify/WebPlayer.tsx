"use client";

import { useEffect, useRef, useState } from "react";
import { useSpotifyStatus } from "@/lib/spotify/useSpotify";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
  }
}

interface SpotifyPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (payload: { device_id?: string; message?: string }) => void) => void;
}

/**
 * Registers this browser as a Spotify Connect device ("Orbit") using the
 * official Web Playback SDK. Playback control still works for any device
 * through the server; this simply makes the browser itself selectable.
 * The SDK script is the one hosted resource an official API requires.
 */
export function WebPlayer() {
  const { data: status } = useSpotifyStatus();
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!status?.connected || playerRef.current) return;

    let cancelled = false;

    const boot = () => {
      if (cancelled || !window.Spotify) return;
      const player = new window.Spotify.Player({
        name: "Orbit",
        getOAuthToken: async (cb) => {
          try {
            const res = await fetch("/api/spotify/token");
            if (!res.ok) return;
            const d = await res.json();
            cb(d.accessToken);
          } catch {
            // token fetch failed; SDK will retry
          }
        },
        volume: 0.6,
      });
      player.addListener("ready", () => setReady(true));
      player.addListener("not_ready", () => setReady(false));
      player.addListener("initialization_error", () => {
        // browser does not support EME playback; controls still work
      });
      player.addListener("authentication_error", () => setReady(false));
      player.addListener("account_error", () => {
        // free accounts cannot stream in-browser; controls still work
      });
      player.connect();
      playerRef.current = player;
    };

    if (window.Spotify) {
      boot();
    } else {
      window.onSpotifyWebPlaybackSDKReady = boot;
      if (!document.getElementById("spotify-sdk")) {
        const script = document.createElement("script");
        script.id = "spotify-sdk";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [status?.connected]);

  // no visible UI; the device shows up in the device picker when ready
  return ready ? null : null;
}
