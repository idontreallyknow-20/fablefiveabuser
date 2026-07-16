import { NextResponse } from "next/server";
import { getSpotifyAccount, spotifyErrorResponse, spotifyFetch } from "@/lib/spotify/server";
import { supabaseServer } from "@/lib/supabase/server";

interface PlaylistsResponse {
  items?: Array<{
    id?: string;
    name?: string;
    uri?: string;
    images?: Array<{ url?: string }> | null;
    tracks?: { total?: number } | null;
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
    const res = await spotifyFetch(account.id, "/me/playlists?limit=30");
    if (!res.ok) {
      return NextResponse.json({ error: "Could not load playlists" }, { status: 502 });
    }
    const data = (await res.json()) as PlaylistsResponse;
    return NextResponse.json({
      playlists: (data.items ?? []).map((p) => ({
        id: p.id ?? "",
        name: p.name ?? "",
        uri: p.uri ?? "",
        image: p.images?.[0]?.url ?? null,
        tracks: p.tracks?.total ?? 0,
      })),
    });
  } catch (e) {
    return spotifyErrorResponse(e);
  }
}
