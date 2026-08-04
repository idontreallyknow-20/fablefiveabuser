"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayerControls } from "@/components/spotify/PlayerControls";
import { WebPlayer } from "@/components/spotify/WebPlayer";
import { IconPlay, IconSpotify, IconVolume } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/settings/store";
import { extractMutedColor } from "@/lib/spotify/glow";
import { useSpotifyPlayback, useSpotifyStatus } from "@/lib/spotify/useSpotify";

interface RecentItem {
  name: string;
  artists: string;
  albumArt: string | null;
  uri: string;
  playedAt: string | null;
}

interface PlaylistItem {
  id: string;
  name: string;
  uri: string;
  image: string | null;
  tracks: number;
}

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function relativeTime(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MusicPage() {
  const { data: status } = useSpotifyStatus();
  const connected = Boolean(status?.configured && status?.connected);
  const playback = useSpotifyPlayback(connected);
  const reducedMotion = useSettings((s) => s.settings.reducedMotion);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: recent } = useQuery({
    queryKey: ["spotify", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/recent");
      if (!res.ok) return { items: [] as RecentItem[] };
      return res.json() as Promise<{ items: RecentItem[] }>;
    },
    enabled: connected,
    staleTime: 60_000,
  });

  const { data: playlists } = useQuery({
    queryKey: ["spotify", "playlists"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/playlists");
      if (!res.ok) return { playlists: [] as PlaylistItem[] };
      return res.json() as Promise<{ playlists: PlaylistItem[] }>;
    },
    enabled: connected,
    staleTime: 300_000,
  });

  const lastPlayed = recent?.items?.[0] ?? null;
  const track = playback.track;
  const art = track?.albumArt ?? lastPlayed?.albumArt ?? null;

  // ambient glow behind the artwork, derived from the artwork itself
  const { data: glowColor } = useQuery({
    queryKey: ["spotify", "glow", art],
    queryFn: () => extractMutedColor(art as string),
    enabled: Boolean(art),
    staleTime: Infinity,
  });
  const glow = art ? (glowColor ?? null) : null;

  // smooth progress between 5s polls: one cheap 1s tick, CSS eases the rest
  const [extraMs, setExtraMs] = useState(0);
  const [lastPolledMs, setLastPolledMs] = useState(playback.progressMs);
  if (lastPolledMs !== playback.progressMs) {
    // poll landed: re-anchor the local tick (render-phase state adjustment)
    setLastPolledMs(playback.progressMs);
    setExtraMs(0);
  }
  useEffect(() => {
    if (!playback.isPlaying || reducedMotion) return;
    const id = setInterval(() => setExtraMs((e) => e + 1000), 1000);
    return () => clearInterval(id);
  }, [playback.isPlaying, reducedMotion]);

  const playUri = async (uri: string) => {
    const res = await fetch("/api/spotify/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "playUri", uri }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error ?? "Playback failed", "error");
    } else {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["spotify", "playback"] }), 400);
    }
  };

  if (!status) return <div className="min-h-[70dvh]" aria-hidden />;

  if (!connected) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <Link
          href="/space/connections"
          className="text-sm text-ink-faint transition-colors duration-[var(--dur-base)] hover:text-ink-dim"
        >
          Connect in Space → Connections
        </Link>
      </div>
    );
  }

  const durationMs = track?.durationMs ?? 0;
  const elapsed = playback.isPlaying && !reducedMotion ? Math.min(6000, extraMs) : 0;
  const progressMs = Math.min(durationMs, playback.progressMs + elapsed);
  const progressPct = durationMs > 0 ? progressMs / durationMs : 0;

  const heroName = track?.name ?? lastPlayed?.name ?? null;
  const heroArtists = track?.artists ?? lastPlayed?.artists ?? null;

  return (
    <div className="fade flex min-h-[calc(100dvh-7.5rem)] flex-col gap-12 lg:flex-row lg:items-stretch lg:gap-16">
      <WebPlayer />

      {/* hero: artwork + type + light */}
      <section
        aria-label="Now playing"
        className="flex flex-1 flex-col items-center justify-center gap-9 py-6 text-center lg:items-start lg:text-left"
      >
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[165%] w-[165%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-[var(--dur-scene)]"
            style={{
              background: glow
                ? `radial-gradient(circle, ${glow} 0%, color-mix(in srgb, ${glow} 45%, transparent) 42%, transparent 72%)`
                : undefined,
              filter: "blur(56px)",
              opacity: glow ? (track ? 0.85 : 0.4) : 0,
            }}
          />
          {art ? (
            // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN artwork must be hotlinked per their terms
            <img
              src={art}
              alt=""
              className={`relative aspect-square w-[min(72vw,300px)] rounded-[24px] border border-line object-cover transition-opacity duration-[var(--dur-scene)] sm:w-[min(56vw,380px)] lg:w-[clamp(300px,32vw,460px)] ${
                track ? "" : "opacity-45 saturate-[0.65]"
              }`}
            />
          ) : (
            <div className="relative flex aspect-square w-[min(72vw,300px)] items-center justify-center rounded-[24px] border border-line bg-bg1 sm:w-[min(56vw,380px)] lg:w-[clamp(300px,32vw,460px)]">
              <IconSpotify size={32} className="text-ink-faint" />
            </div>
          )}
          {!track && lastPlayed && (
            <button
              aria-label={`Play ${lastPlayed.name}`}
              onClick={() => playUri(lastPlayed.uri)}
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-bg2 text-ink transition-colors duration-[var(--dur-base)] hover:bg-bg3 active:scale-[0.98]"
            >
              <IconPlay size={22} />
            </button>
          )}
        </div>

        <div className="w-full max-w-[560px]">
          <p className="eyebrow mb-3">
            {track ? (playback.isPlaying ? "Now playing" : "Paused") : "Last played"}
          </p>
          {heroName ? (
            <>
              <h1 className="display text-balance text-[clamp(28px,4vw,52px)] font-medium leading-[1.08] tracking-tight text-ink">
                {heroName}
              </h1>
              <p className="mt-2.5 text-[17px] text-ink-dim">{heroArtists}</p>
            </>
          ) : (
            <h1 className="display text-[clamp(24px,3vw,36px)] font-medium text-ink-faint">
              Nothing playing
            </h1>
          )}

          {track && durationMs > 0 && (
            <div className="mt-7">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-bg3">
                <div
                  className="h-full origin-left rounded-full bg-accent/80"
                  style={{
                    transform: `scaleX(${progressPct})`,
                    transition: reducedMotion ? "none" : "transform 1s linear",
                  }}
                />
              </div>
              <div className="tnum mt-2 flex justify-between font-mono text-[11px] text-ink-faint">
                <span>{formatMs(progressMs)}</span>
                <span>{formatMs(durationMs)}</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-5 lg:items-start">
            <PlayerControls playback={playback} />
            {playback.volume !== null && (
              <label className="flex w-full max-w-[260px] items-center gap-3">
                <IconVolume size={15} className="shrink-0 text-ink-faint" />
                <span className="sr-only">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={playback.volume}
                  onMouseUp={(e) => playback.setVolume(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => playback.setVolume(Number((e.target as HTMLInputElement).value))}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-bg3 accent-(--accent)"
                />
              </label>
            )}
            {playback.deviceName && (
              <p className="font-mono text-[11px] tracking-[0.08em] text-ink-faint">
                {playback.deviceName}
              </p>
            )}
            {playback.error && <p className="text-[12.5px] text-danger">{playback.error}</p>}
          </div>
        </div>
      </section>

      {/* rail: recent + playlists */}
      <aside
        aria-label="Library"
        className="flex w-full flex-col gap-8 pb-4 lg:w-[320px] lg:shrink-0 lg:justify-center"
      >
        <section aria-label="Recently played">
          <p className="eyebrow mb-2.5">Recent</p>
          <div className="flex flex-col">
            {(recent?.items ?? []).slice(0, 6).map((item, i) => (
              <button
                key={`${item.uri}-${i}`}
                onClick={() => playUri(item.uri)}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-[var(--dur-base)] hover:bg-bg1"
              >
                {item.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN artwork must be hotlinked per their terms
                  <img
                    src={item.albumArt}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-md border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-bg2">
                    <IconSpotify size={12} className="text-ink-faint" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-dim group-hover:text-ink">
                    {item.name}
                  </span>
                  <span className="block truncate text-[12px] text-ink-faint">{item.artists}</span>
                </span>
                <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">
                  {relativeTime(item.playedAt)}
                </span>
              </button>
            ))}
            {(recent?.items ?? []).length === 0 && (
              <p className="px-2 text-sm text-ink-faint">Nothing yet.</p>
            )}
          </div>
        </section>

        <section aria-label="Playlists">
          <p className="eyebrow mb-2.5">Playlists</p>
          <div className="flex max-h-[320px] flex-col overflow-y-auto pr-1">
            {(playlists?.playlists ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => playUri(p.uri)}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-[var(--dur-base)] hover:bg-bg1"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN artwork must be hotlinked per their terms
                  <img
                    src={p.image}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-md border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-bg2">
                    <IconSpotify size={12} className="text-ink-faint" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-ink-dim group-hover:text-ink">
                  {p.name}
                </span>
                <span className="tnum shrink-0 font-mono text-[11px] text-ink-faint">
                  {p.tracks}
                </span>
              </button>
            ))}
            {(playlists?.playlists ?? []).length === 0 && (
              <p className="px-2 text-sm text-ink-faint">No playlists to show.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
