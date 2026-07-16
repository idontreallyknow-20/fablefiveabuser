import { NextResponse } from "next/server";
import {
  getSpotifyAccount,
  getValidSpotifyToken,
  spotifyErrorResponse,
} from "@/lib/spotify/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Access token for the Spotify Web Playback SDK. This is the one deliberate
 * exception to "tokens never reach the browser": the SDK runs client-side
 * and requires the user token. The refresh token never leaves the server.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const account = await getSpotifyAccount(user.id);
    const { accessToken, expiresAt } = await getValidSpotifyToken(account.id);
    return NextResponse.json({ accessToken, expiresAt });
  } catch (e) {
    return spotifyErrorResponse(e);
  }
}
