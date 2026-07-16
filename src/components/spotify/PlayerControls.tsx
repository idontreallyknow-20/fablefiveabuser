"use client";

import { IconNext, IconPause, IconPlay, IconPrev } from "@/components/ui/Icons";
import type { SpotifyPlaybackState } from "@/lib/spotify/useSpotify";

export function PlayerControls({
  playback,
  compact = false,
}: {
  playback: SpotifyPlaybackState;
  compact?: boolean;
}) {
  const btn =
    "flex items-center justify-center rounded-full text-ink-dim transition-colors duration-[var(--dur-base)] hover:text-ink hover:bg-bg2 disabled:opacity-40";
  const size = compact ? "h-9 w-9" : "h-11 w-11";
  const mainSize = compact ? "h-10 w-10" : "h-14 w-14";

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        aria-label="Previous track"
        className={`${btn} ${size}`}
        disabled={!playback.canControl}
        onClick={() => playback.previous()}
      >
        <IconPrev size={compact ? 15 : 18} />
      </button>
      <button
        aria-label={playback.isPlaying ? "Pause" : "Play"}
        className={`${btn} ${mainSize} border border-line bg-bg2 hover:border-line-strong hover:bg-bg3`}
        disabled={!playback.canControl}
        onClick={() => (playback.isPlaying ? playback.pause() : playback.play())}
      >
        {playback.isPlaying ? (
          <IconPause size={compact ? 16 : 20} />
        ) : (
          <IconPlay size={compact ? 16 : 20} />
        )}
      </button>
      <button
        aria-label="Next track"
        className={`${btn} ${size}`}
        disabled={!playback.canControl}
        onClick={() => playback.next()}
      >
        <IconNext size={compact ? 15 : 18} />
      </button>
    </div>
  );
}
