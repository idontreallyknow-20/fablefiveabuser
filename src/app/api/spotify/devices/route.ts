import { NextResponse } from "next/server";
import { getSpotifyAccount, spotifyErrorResponse, spotifyFetch } from "@/lib/spotify/server";
import { supabaseServer } from "@/lib/supabase/server";

interface DevicesResponse {
  devices?: Array<{
    id?: string | null;
    name?: string;
    type?: string;
    is_active?: boolean;
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
    const res = await spotifyFetch(account.id, "/me/player/devices");
    if (!res.ok) {
      return NextResponse.json({ error: "Could not list Spotify devices" }, { status: 502 });
    }
    const data = (await res.json()) as DevicesResponse;
    return NextResponse.json({
      devices: (data.devices ?? []).map((d) => ({
        id: d.id ?? null,
        name: d.name ?? "Unknown device",
        type: d.type ?? "Unknown",
        isActive: Boolean(d.is_active),
      })),
    });
  } catch (e) {
    return spotifyErrorResponse(e);
  }
}
