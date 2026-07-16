import { NextResponse } from "next/server";
import {
  getSpotifyAccount,
  largestImage,
  spotifyErrorResponse,
  spotifyFetch,
} from "@/lib/spotify/server";
import { supabaseServer } from "@/lib/supabase/server";

interface RecentlyPlayedResponse {
  items?: Array<{
    played_at?: string;
    track?: {
      name?: string;
      uri?: string;
      artists?: Array<{ name?: string }>;
      album?: { images?: Array<{ url?: string; width?: number | null }> };
    };
  }>;
}

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const account = await getSpotifyAccount(user.id);
    const res = await spotifyFetch(account.id, "/me/player/recently-played?limit=12");
    if (!res.ok) {
      return NextResponse.json({ error: "Could not load recently played" }, { status: 502 });
    }
    const data = (await res.json()) as RecentlyPlayedResponse;
    return NextResponse.json({
      items: (data.items ?? [])
        .filter((i) => i.track)
        .map((i) => ({
          name: i.track?.name ?? "",
          artists: (i.track?.artists ?? [])
            .map((a) => a.name)
            .filter(Boolean)
            .join(", "),
          albumArt: largestImage(i.track?.album?.images),
          uri: i.track?.uri ?? "",
          playedAt: i.played_at ?? null,
        })),
    });
  } catch (e) {
    return spotifyErrorResponse(e);
  }
}
