import { NextResponse } from "next/server";
import { env, integrationStatus } from "@/lib/env";
import { SPOTIFY_SCOPES, spotifyRedirectUri } from "@/lib/spotify/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!integrationStatus.spotify) {
    return NextResponse.json(
      { error: "Server integrations are not configured yet" },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.spotifyClientId,
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    scope: SPOTIFY_SCOPES,
    state,
    // Always show the account picker so a second Spotify account can be added.
    show_dialog: "true",
  });

  const res = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  res.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https"),
    path: "/",
    maxAge: 600,
  });
  return res;
}
