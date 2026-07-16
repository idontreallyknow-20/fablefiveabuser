import { NextResponse } from "next/server";
import type { Json, Tables } from "@/lib/db/types";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export const SPOTIFY_SCOPES =
  "user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-recently-played playlist-read-private streaming";

export type IntegrationAccount = Tables<"integration_accounts">;

export type SpotifyErrorCode =
  | "not_configured"
  | "not_connected"
  | "reconnect"
  | "rate_limited";

/** Typed error the API routes translate into JSON responses. */
export class SpotifyError extends Error {
  readonly code: SpotifyErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: SpotifyErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "SpotifyError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function spotifyRedirectUri() {
  return `${env.appUrl}/api/spotify/callback`;
}

/** Service-role client or a typed not_configured error. */
function admin() {
  const client = supabaseAdmin();
  if (!client) {
    throw new SpotifyError("not_configured", "Server integrations are not configured yet");
  }
  return client;
}

/** Safely narrow an account's meta Json to an object. */
export function metaOf(meta: Json): { [key: string]: Json | undefined } {
  return meta !== null && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
}

/**
 * Resolve the account to act on: the explicitly requested one, else the
 * profile marked meta.active, else the first healthy account.
 */
export async function getSpotifyAccount(
  userId: string,
  accountId?: string,
): Promise<IntegrationAccount> {
  const db = admin();

  if (accountId) {
    const { data, error } = await db
      .from("integration_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .eq("provider", "spotify")
      .maybeSingle();
    if (error) throw new Error(`Could not load Spotify account: ${error.message}`);
    if (!data) throw new SpotifyError("not_connected", "Spotify account not found");
    if (!data.is_active) {
      throw new SpotifyError("reconnect", "Spotify account needs reconnecting");
    }
    return data;
  }

  const { data, error } = await db
    .from("integration_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .order("created_at");
  if (error) throw new Error(`Could not load Spotify accounts: ${error.message}`);

  const accounts = data ?? [];
  if (accounts.length === 0) {
    throw new SpotifyError("not_connected", "No Spotify account connected");
  }

  const account =
    accounts.find((a) => a.is_active && metaOf(a.meta).active === true) ??
    accounts.find((a) => a.is_active) ??
    accounts[0];
  if (!account.is_active) {
    throw new SpotifyError("reconnect", "Spotify account needs reconnecting");
  }
  return account;
}

async function markNeedsReconnect(accountId: string) {
  try {
    const db = admin();
    await db
      .from("integration_accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", accountId);
  } catch {
    // best-effort; the typed error still surfaces to the caller
  }
}

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

function basicAuthHeader() {
  return `Basic ${Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString("base64")}`;
}

async function refreshSpotifyToken(
  accountId: string,
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    // 400 invalid_grant means the user revoked access in Spotify settings.
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      await markNeedsReconnect(accountId);
      throw new SpotifyError("reconnect", "Spotify account needs reconnecting");
    }
    throw new Error(`Spotify token refresh failed (${res.status})`);
  }

  const json = (await res.json()) as SpotifyTokenResponse;
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const db = admin();
  const update: {
    access_token: string;
    expires_at: string;
    updated_at: string;
    refresh_token?: string;
  } = {
    access_token: json.access_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  // Spotify occasionally rotates refresh tokens; persist the new one.
  if (json.refresh_token) update.refresh_token = json.refresh_token;
  const { error } = await db
    .from("integration_secrets")
    .update(update)
    .eq("account_id", accountId);
  if (error) throw new Error(`Could not persist refreshed Spotify token: ${error.message}`);

  return { accessToken: json.access_token, expiresAt };
}

/**
 * Return a currently valid access token for the account, refreshing when it
 * expires within 60 seconds (or when forceRefresh is set).
 */
export async function getValidSpotifyToken(
  accountId: string,
  opts?: { forceRefresh?: boolean },
): Promise<{ accessToken: string; expiresAt: string }> {
  const db = admin();
  const { data: secret, error } = await db
    .from("integration_secrets")
    .select("access_token, refresh_token, expires_at")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw new Error(`Could not load Spotify credentials: ${error.message}`);
  if (!secret) {
    await markNeedsReconnect(accountId);
    throw new SpotifyError("reconnect", "Spotify account needs reconnecting");
  }

  const expiresAtMs = secret.expires_at ? Date.parse(secret.expires_at) : 0;
  const stillFresh = Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() > 60_000;
  if (stillFresh && secret.access_token && !opts?.forceRefresh) {
    return { accessToken: secret.access_token, expiresAt: secret.expires_at as string };
  }

  if (!secret.refresh_token) {
    await markNeedsReconnect(accountId);
    throw new SpotifyError("reconnect", "Spotify account needs reconnecting");
  }
  return refreshSpotifyToken(accountId, secret.refresh_token);
}

/**
 * Fetch against the Spotify Web API with the account's token. Handles a 401
 * by refreshing once and retrying; converts 429 into a typed rate-limit
 * error. Any other response is returned for the caller to interpret.
 */
export async function spotifyFetch(
  accountId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const doFetch = async (token: string) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${SPOTIFY_API}${path}`, { ...init, headers, cache: "no-store" });
  };

  let { accessToken } = await getValidSpotifyToken(accountId);
  let res = await doFetch(accessToken);

  if (res.status === 401) {
    ({ accessToken } = await getValidSpotifyToken(accountId, { forceRefresh: true }));
    res = await doFetch(accessToken);
    if (res.status === 401) {
      await markNeedsReconnect(accountId);
      throw new SpotifyError("reconnect", "Spotify account needs reconnecting");
    }
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "1");
    throw new SpotifyError(
      "rate_limited",
      "Spotify is rate limiting requests. Try again in a moment.",
      Number.isFinite(retryAfter) ? retryAfter : 1,
    );
  }

  return res;
}

/** Authorization-code exchange for the OAuth callback. */
export async function exchangeSpotifyCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyRedirectUri(),
    }).toString(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify code exchange failed (${res.status})`);

  const json = (await res.json()) as SpotifyTokenResponse;
  if (!json.access_token || !json.refresh_token) {
    throw new Error("Spotify code exchange returned an incomplete token set");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

/** Pick the largest image (Spotify usually sorts largest-first; be safe). */
export function largestImage(
  images: Array<{ url?: string; width?: number | null }> | undefined | null,
): string | null {
  if (!images || images.length === 0) return null;
  let best: { url?: string; width?: number | null } | null = null;
  for (const img of images) {
    if (!img?.url) continue;
    if (!best || (img.width ?? 0) > (best.width ?? 0)) best = img;
  }
  return best?.url ?? null;
}

/** Map typed Spotify errors (and unknowns) to a JSON response. */
export function spotifyErrorResponse(e: unknown): NextResponse {
  if (e instanceof SpotifyError) {
    switch (e.code) {
      case "not_configured":
        return NextResponse.json(
          { error: "Server integrations are not configured yet" },
          { status: 503 },
        );
      case "not_connected":
        return NextResponse.json({ error: e.message }, { status: 404 });
      case "reconnect":
        return NextResponse.json(
          { error: "Spotify account needs reconnecting" },
          { status: 409 },
        );
      case "rate_limited":
        return NextResponse.json(
          { error: e.message, retryAfter: e.retryAfterSeconds ?? 1 },
          { status: 429 },
        );
    }
  }
  console.error("[spotify]", e);
  return NextResponse.json({ error: "Spotify request failed" }, { status: 500 });
}
