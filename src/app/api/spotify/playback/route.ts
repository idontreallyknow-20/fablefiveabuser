import { NextResponse } from "next/server";
import {
  getSpotifyAccount,
  largestImage,
  spotifyErrorResponse,
  spotifyFetch,
} from "@/lib/spotify/server";
import { supabaseServer } from "@/lib/supabase/server";

interface SpotifyPlayerResponse {
  is_playing?: boolean;
  progress_ms?: number | null;
  device?: { name?: string | null; volume_percent?: number | null } | null;
  item?: {
    name?: string;
    uri?: string;
    duration_ms?: number;
    artists?: Array<{ name?: string }>;
    album?: { images?: Array<{ url?: string; width?: number | null }> };
    // episode fields
    show?: { name?: string };
    images?: Array<{ url?: string; width?: number | null }>;
  } | null;
}

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const account = await getSpotifyAccount(user.id);
    const res = await spotifyFetch(account.id, "/me/player");

    // Nothing playing anywhere: pass the 204 through.
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    if (!res.ok) {
      return NextResponse.json({ error: "Spotify playback request failed" }, { status: 502 });
    }

    const data = (await res.json()) as SpotifyPlayerResponse;
    const item = data.item ?? null;
    const track = item
      ? {
          name: item.name ?? "",
          artists:
            (item.artists ?? [])
              .map((a) => a.name)
              .filter(Boolean)
              .join(", ") ||
            item.show?.name ||
            "",
          albumArt: largestImage(item.album?.images ?? item.images),
          durationMs: item.duration_ms ?? 0,
          uri: item.uri ?? "",
        }
      : null;

    return NextResponse.json({
      track,
      isPlaying: Boolean(data.is_playing),
      progressMs: data.progress_ms ?? 0,
      deviceName: data.device?.name ?? null,
      volume: data.device?.volume_percent ?? null,
    });
  } catch (e) {
    return spotifyErrorResponse(e);
  }
}
