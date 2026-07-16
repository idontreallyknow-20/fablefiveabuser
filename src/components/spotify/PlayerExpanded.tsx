"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/settings/store";
import type { SpotifyPlaybackState } from "@/lib/spotify/useSpotify";
import { PlayerControls } from "./PlayerControls";
import { IconDevice, IconSpotify, IconVolume } from "@/components/ui/Icons";

export function PlayerExpanded({
  open,
  onClose,
  playback,
}: {
  open: boolean;
  onClose: () => void;
  playback: SpotifyPlaybackState;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings, set } = useSettings();

  const { data: devices } = useQuery({
    queryKey: ["spotify", "devices"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/devices");
      if (!res.ok) return { devices: [] as { id: string; name: string; type: string; isActive: boolean }[] };
      return res.json() as Promise<{ devices: { id: string; name: string; type: string; isActive: boolean }[] }>;
    },
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  const { data: playlists } = useQuery({
    queryKey: ["spotify", "playlists"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/playlists");
      if (!res.ok) return { playlists: [] as { id: string; name: string; uri: string; image: string | null; tracks: number }[] };
      return res.json() as Promise<{ playlists: { id: string; name: string; uri: string; image: string | null; tracks: number }[] }>;
    },
    enabled: open,
  });

  const control = async (action: string, body: Record<string, unknown> = {}) => {
    const res = await fetch("/api/spotify/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error ?? "That did not work", "error");
    } else {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["spotify"] }), 400);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Music" wide>
      <div className="space-y-6">
        {playback.track && (
          <div className="flex items-center gap-4">
            {playback.track.albumArt && (
              // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN artwork must be hotlinked per their terms
              <img
                src={playback.track.albumArt}
                alt=""
                className="h-20 w-20 rounded-xl border border-line object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-ink">{playback.track.name}</p>
              <p className="truncate text-sm text-ink-faint">{playback.track.artists}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-faint">
                <IconSpotify size={11} /> Spotify
                {playback.deviceName ? ` · ${playback.deviceName}` : ""}
              </p>
            </div>
            <PlayerControls playback={playback} />
          </div>
        )}

        {playback.volume !== null && (
          <label className="flex items-center gap-3">
            <IconVolume size={16} className="shrink-0 text-ink-faint" />
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

        <section aria-label="Devices">
          <p className="eyebrow mb-2">Play on</p>
          <div className="flex flex-col gap-1">
            {(devices?.devices ?? []).map((d) => (
              <button
                key={d.id}
                onClick={() => control("transfer", { deviceId: d.id })}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  d.isActive ? "bg-accent-soft text-accent" : "text-ink-dim hover:bg-bg1 hover:text-ink"
                }`}
              >
                <IconDevice size={15} />
                {d.name}
                <span className="ml-auto text-[11px] uppercase text-ink-faint">{d.type}</span>
              </button>
            ))}
            {(devices?.devices ?? []).length === 0 && (
              <p className="px-1 text-sm text-ink-faint">
                No devices found. Open Spotify anywhere, or keep this tab open: it
                appears as the device named Orbit.
              </p>
            )}
          </div>
        </section>

        <section aria-label="Playlists">
          <p className="eyebrow mb-2">Playlists</p>
          <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {(playlists?.playlists ?? []).map((p) => {
              const isFocus = settings.focusPlaylistUri === p.uri;
              return (
                <div
                  key={p.id}
                  className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-bg1"
                >
                  <button
                    onClick={() => control("playUri", { uri: p.uri })}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Spotify CDN artwork must be hotlinked per their terms
                      <img src={p.image} alt="" className="h-8 w-8 rounded-md border border-line object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-bg2">
                        <IconSpotify size={12} className="text-ink-faint" />
                      </span>
                    )}
                    <span className="truncate text-sm text-ink-dim group-hover:text-ink">{p.name}</span>
                  </button>
                  <button
                    onClick={() => {
                      set({ focusPlaylistUri: isFocus ? null : p.uri });
                      toast(isFocus ? "Removed focus playlist" : "Set as focus playlist", "success");
                    }}
                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] transition-colors ${
                      isFocus
                        ? "text-accent"
                        : "text-ink-faint opacity-0 hover:text-ink-dim group-hover:opacity-100"
                    }`}
                  >
                    {isFocus ? "Focus" : "Use for focus"}
                  </button>
                </div>
              );
            })}
            {(playlists?.playlists ?? []).length === 0 && (
              <p className="px-1 text-sm text-ink-faint">No playlists to show.</p>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
