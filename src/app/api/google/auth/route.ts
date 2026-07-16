import { NextResponse } from "next/server";
import { env, integrationStatus } from "@/lib/env";
import { GOOGLE_SCOPES, googleRedirectUri } from "@/lib/google/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!integrationStatus.google) {
    return NextResponse.json(
      { error: "Server integrations are not configured yet" },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    response_type: "code",
    redirect_uri: googleRedirectUri(),
    scope: GOOGLE_SCOPES,
    // Offline access + forced consent so we always receive a refresh token.
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https"),
    path: "/",
    maxAge: 600,
  });
  return res;
}
