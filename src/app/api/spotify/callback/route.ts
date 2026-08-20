import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/db/types";
import { env, integrationStatus } from "@/lib/env";
import { exchangeSpotifyCode, metaOf, SPOTIFY_SCOPES } from "@/lib/spotify/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const STATE_COOKIE = "spotify_oauth_state";

function redirectTo(params: Record<string, string>) {
  const res = NextResponse.redirect(
    new URL(`/space/connections?${new URLSearchParams(params).toString()}`, env.appUrl),
  );
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

interface SpotifyProfile {
  id: string;
  display_name?: string | null;
  email?: string | null;
  product?: string | null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return redirectTo({
      spotify_error:
        oauthError === "access_denied"
          ? "Spotify connection was cancelled."
          : "Spotify sign-in failed. Please try again.",
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectTo({ spotify_error: "Sign-in state did not match. Please try connecting again." });
  }

  if (!integrationStatus.spotify) {
    return redirectTo({ spotify_error: "Spotify is not configured on the server yet." });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirectTo({ spotify_error: "You need to be signed in to connect Spotify." });

  const db = supabaseAdmin();
  if (!db) return redirectTo({ spotify_error: "Server integrations are not configured yet." });

  try {
    const tokens = await exchangeSpotifyCode(code);

    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      cache: "no-store",
    });
    if (!meRes.ok) throw new Error(`Spotify profile fetch failed (${meRes.status})`);
    const me = (await meRes.json()) as SpotifyProfile;
    if (!me.id) throw new Error("Spotify profile response was missing an id");

    const { data: existing, error: listError } = await db
      .from("integration_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "spotify");
    if (listError) throw new Error(listError.message);

    const accounts = existing ?? [];
    const current = accounts.find((a) => a.external_id === me.id);
    // First Spotify account becomes the active profile; a reconnect keeps the
    // account's previous flag; adding a second account never steals "active".
    const activeFlag = current ? metaOf(current.meta).active === true : accounts.length === 0;

    const label = me.display_name || me.email || "Spotify";
    const scopes = SPOTIFY_SCOPES.split(" ");
    const now = new Date().toISOString();
    let accountId: string;

    if (current) {
      const meta: Json = {
        ...metaOf(current.meta),
        product: me.product ?? null,
        active: activeFlag,
      };
      const { error } = await db
        .from("integration_accounts")
        .update({
          label,
          email: me.email ?? "",
          scopes,
          is_active: true,
          meta,
          updated_at: now,
        })
        .eq("id", current.id);
      if (error) throw new Error(error.message);
      accountId = current.id;
    } else {
      const meta: Json = { product: me.product ?? null, active: activeFlag };
      const { data: inserted, error } = await db
        .from("integration_accounts")
        .insert({
          user_id: user.id,
          provider: "spotify",
          external_id: me.id,
          label,
          email: me.email ?? "",
          scopes,
          is_active: true,
          meta,
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "Could not save Spotify account");
      accountId = inserted.id;
    }

    const { error: secretError } = await db.from("integration_secrets").upsert(
      {
        account_id: accountId,
        user_id: user.id,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt,
        updated_at: now,
      },
      { onConflict: "account_id" },
    );
    if (secretError) throw new Error(secretError.message);

    return redirectTo({ connected: "spotify" });
  } catch (e) {
    console.error("[spotify callback]", e);
    return redirectTo({ spotify_error: "Could not finish connecting Spotify. Please try again." });
  }
}
