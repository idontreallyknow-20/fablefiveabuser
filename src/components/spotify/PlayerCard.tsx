"use client";

import Link from "next/link";
import { IconSpotify } from "@/components/ui/Icons";
import { useSpotifyStatus, useSpotifyPlayback } from "@/lib/spotify/useSpotify";
import { PlayerControls } from "./PlayerControls";

/**
 * Compact player for Today and side displays. Shows honest states:
 * not configured -> setup pointer; configured but not connected -> connect;
 * connected -> live playback.
 */
export function PlayerCard() {
  const { data: status } = useSpotifyStatus();
  const playback = useSpotifyPlayback(Boolean(status?.connected));

  if (!status) {
    return <div className="surface h-[104px] animate-pulse" aria-hidden />;
  }

  if (!status.configured) {
    return (
      <div className="surface flex items-center gap-3.5 p-4">
        <IconSpotify size={20} className="shrink-0 text-ink-faint" />
        <div className="min-w-0">
          <p className="text-sm text-ink-dim">Spotify is not set up yet</p>
          <p className="text-[12.5px] text-ink-faint">
            Add the API keys in Vercel, then connect in{" "}
            <Link href="/space/connections" className="text-accent hover:underline">
              Space
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="surface flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3.5">
          <IconSpotify size={20} className="shrink-0 text-ink-faint" />
          <p className="text-sm text-ink-dim">Connect Spotify to play music here</p>
        </div>
        <a
          href="/api/spotify/auth"
          className="shrink-0 rounded-xl border border-(--accent)/35 bg-accent-soft px-3.5 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-(--accent)/22"
        >
          Connect
        </a>
      </div>
    );
  }

  const track = playback.track;

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-3.5">
        {track?.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN artwork must be hotlinked per their terms
          <img
            src={track.albumArt}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-line bg-bg2">
            <IconSpotify size={18} className="text-ink-faint" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {track ? (
            <>
              <p className="truncate text-sm font-medium text-ink">{track.name}</p>
              <p className="truncate text-[13px] text-ink-faint">{track.artists}</p>
            </>
          ) : (
            <p className="text-sm text-ink-faint">Nothing playing</p>
          )}
          <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-faint">
            <IconSpotify size={11} />
            <span>Spotify</span>
          </div>
        </div>
        <PlayerControls playback={playback} compact />
      </div>
      {track && (
        <div className="mt-3">
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-bg3">
            <div
              className="h-full bg-accent/70 transition-[width] duration-1000 ease-linear"
              style={{ width: `${(playback.progressMs / Math.max(1, track.durationMs)) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
