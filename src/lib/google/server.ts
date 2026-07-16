import { NextResponse } from "next/server";
import type { Json, Tables, TablesInsert } from "@/lib/db/types";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly openid email";

export type IntegrationAccount = Tables<"integration_accounts">;

export type GoogleErrorCode =
  | "not_configured"
  | "not_connected"
  | "reconnect"
  | "rate_limited";

/** Typed error the API routes translate into JSON responses. */
export class GoogleError extends Error {
  readonly code: GoogleErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: GoogleErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "GoogleError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function googleRedirectUri() {
  return `${env.appUrl}/api/google/callback`;
}

function admin() {
  const client = supabaseAdmin();
  if (!client) {
    throw new GoogleError("not_configured", "Server integrations are not configured yet");
  }
  return client;
}

/** Safely narrow an account's meta Json to an object. */
export function metaOf(meta: Json): { [key: string]: Json | undefined } {
  return meta !== null && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
}

/** The calendars the user chose to sync; defaults to the primary calendar. */
export function selectedCalendarsOf(account: IntegrationAccount): string[] {
  const raw = metaOf(account.meta).selectedCalendars;
  if (Array.isArray(raw)) {
    const ids = raw.filter((v): v is string => typeof v === "string" && v.length > 0);
    if (ids.length > 0) return ids;
  }
  return ["primary"];
}

function syncTokensOf(account: IntegrationAccount): Record<string, string> {
  const raw = metaOf(account.meta).syncTokens;
  const tokens: Record<string, string> = {};
  if (raw !== null && raw !== undefined && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string") tokens[key] = value;
    }
  }
  return tokens;
}

/**
 * Resolve the account to act on: the explicitly requested one, else the
 * profile marked meta.active, else the first healthy account.
 */
export async function getGoogleAccount(
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
      .eq("provider", "google")
      .maybeSingle();
    if (error) throw new Error(`Could not load Google account: ${error.message}`);
    if (!data) throw new GoogleError("not_connected", "Google account not found");
    if (!data.is_active) {
      throw new GoogleError("reconnect", "Google account needs reconnecting");
    }
    return data;
  }

  const { data, error } = await db
    .from("integration_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .order("created_at");
  if (error) throw new Error(`Could not load Google accounts: ${error.message}`);

  const accounts = data ?? [];
  if (accounts.length === 0) {
    throw new GoogleError("not_connected", "No Google account connected");
  }

  const account =
    accounts.find((a) => a.is_active && metaOf(a.meta).active === true) ??
    accounts.find((a) => a.is_active) ??
    accounts[0];
  if (!account.is_active) {
    throw new GoogleError("reconnect", "Google account needs reconnecting");
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

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

async function refreshGoogleToken(
  accountId: string,
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
    }).toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    // invalid_grant → the user revoked access (or the token expired).
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      await markNeedsReconnect(accountId);
      throw new GoogleError("reconnect", "Google account needs reconnecting");
    }
    throw new Error(`Google token refresh failed (${res.status})`);
  }

  const json = (await res.json()) as GoogleTokenResponse;
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const db = admin();
  // Google refresh tokens do not rotate: only overwrite the stored
  // refresh_token if the response (unusually) includes a new one.
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
  if (json.refresh_token) update.refresh_token = json.refresh_token;
  const { error } = await db
    .from("integration_secrets")
    .update(update)
    .eq("account_id", accountId);
  if (error) throw new Error(`Could not persist refreshed Google token: ${error.message}`);

  return { accessToken: json.access_token, expiresAt };
}

/** Valid access token for the account, refreshing when within 60s of expiry. */
export async function getValidGoogleToken(
  accountId: string,
  opts?: { forceRefresh?: boolean },
): Promise<{ accessToken: string; expiresAt: string }> {
  const db = admin();
  const { data: secret, error } = await db
    .from("integration_secrets")
    .select("access_token, refresh_token, expires_at")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw new Error(`Could not load Google credentials: ${error.message}`);
  if (!secret) {
    await markNeedsReconnect(accountId);
    throw new GoogleError("reconnect", "Google account needs reconnecting");
  }

  const expiresAtMs = secret.expires_at ? Date.parse(secret.expires_at) : 0;
  const stillFresh = Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() > 60_000;
  if (stillFresh && secret.access_token && !opts?.forceRefresh) {
    return { accessToken: secret.access_token, expiresAt: secret.expires_at as string };
  }

  if (!secret.refresh_token) {
    await markNeedsReconnect(accountId);
    throw new GoogleError("reconnect", "Google account needs reconnecting");
  }
  return refreshGoogleToken(accountId, secret.refresh_token);
}

/**
 * Fetch against the Google Calendar API with the account's token. Handles a
 * 401 by refreshing once and retrying; converts 429 into a typed rate-limit
 * error. Any other response is returned for the caller to interpret.
 */
export async function googleFetch(
  accountId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const doFetch = async (token: string) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${CALENDAR_API}${path}`, { ...init, headers, cache: "no-store" });
  };

  let { accessToken } = await getValidGoogleToken(accountId);
  let res = await doFetch(accessToken);

  if (res.status === 401) {
    ({ accessToken } = await getValidGoogleToken(accountId, { forceRefresh: true }));
    res = await doFetch(accessToken);
    if (res.status === 401) {
      await markNeedsReconnect(accountId);
      throw new GoogleError("reconnect", "Google account needs reconnecting");
    }
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "2");
    throw new GoogleError(
      "rate_limited",
      "Google Calendar is rate limiting requests. Try again in a moment.",
      Number.isFinite(retryAfter) ? retryAfter : 2,
    );
  }

  return res;
}

/** Authorization-code exchange for the OAuth callback. */
export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: googleRedirectUri(),
    }).toString(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google code exchange failed (${res.status})`);

  const json = (await res.json()) as GoogleTokenResponse;
  if (!json.access_token) throw new Error("Google code exchange returned no access token");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  };
}

export interface GoogleUserinfo {
  sub: string;
  email?: string;
  name?: string;
}

export async function fetchGoogleUserinfo(accessToken: string): Promise<GoogleUserinfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google userinfo fetch failed (${res.status})`);
  const json = (await res.json()) as GoogleUserinfo;
  if (!json.sub) throw new Error("Google userinfo response was missing sub");
  return json;
}

/** Map typed Google errors (and unknowns) to a JSON response. */
export function googleErrorResponse(e: unknown): NextResponse {
  if (e instanceof GoogleError) {
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
          { error: "Google account needs reconnecting" },
          { status: 409 },
        );
      case "rate_limited":
        return NextResponse.json(
          { error: e.message, retryAfter: e.retryAfterSeconds ?? 2 },
          { status: 429 },
        );
    }
  }
  console.error("[google]", e);
  return NextResponse.json({ error: "Google Calendar request failed" }, { status: 500 });
}

// ---------------------------------------------------------------------------
// Calendar sync
// ---------------------------------------------------------------------------

/** Google's fixed event colorId palette (1-11). */
const GOOGLE_COLOR_HEX: Record<string, string> = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6bf26",
  "6": "#f4511e",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d50000",
};

export interface GoogleEvent {
  id?: string;
  status?: string;
  etag?: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  recurringEventId?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}

/** Map a remote event onto a calendar_events cache row. */
export function mapGoogleEvent(
  userId: string,
  accountId: string,
  calendarId: string,
  ev: GoogleEvent,
): TablesInsert<"calendar_events"> {
  return {
    user_id: userId,
    account_id: accountId,
    calendar_id: calendarId,
    event_id: ev.id ?? "",
    title: ev.summary ?? "(no title)",
    description: ev.description ?? "",
    location: ev.location ?? "",
    starts_at: ev.start?.dateTime ?? ev.start?.date ?? null,
    ends_at: ev.end?.dateTime ?? ev.end?.date ?? null,
    all_day: Boolean(ev.start?.date),
    color: ev.colorId ? (GOOGLE_COLOR_HEX[ev.colorId] ?? null) : null,
    status: ev.status ?? "confirmed",
    recurring_id: ev.recurringEventId ?? null,
    updated_at_remote: ev.updated ?? null,
    updated_at: new Date().toISOString(),
  };
}

interface EventsListPage {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

async function listCalendarChanges(
  accountId: string,
  calendarId: string,
  syncToken: string | undefined,
): Promise<{ events: GoogleEvent[]; nextSyncToken: string | null }> {
  let token = syncToken;
  let pageToken: string | undefined;
  let attemptedFullResync = !token;
  const events: GoogleEvent[] = [];
  let nextSyncToken: string | null = null;

  for (;;) {
    const params = new URLSearchParams({
      singleEvents: "true",
      maxResults: "250",
      showDeleted: "true",
    });
    if (token) {
      params.set("syncToken", token);
    } else {
      params.set(
        "timeMin",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );
      params.set("timeMax", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await googleFetch(
      accountId,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );

    // 410 GONE: the sync token expired — drop it and run a full window sync.
    if (res.status === 410 && !attemptedFullResync) {
      token = undefined;
      pageToken = undefined;
      events.length = 0;
      attemptedFullResync = true;
      continue;
    }
    if (!res.ok) throw new Error(`Google events.list failed (${res.status})`);

    const page = (await res.json()) as EventsListPage;
    events.push(...(page.items ?? []));
    if (page.nextPageToken) {
      pageToken = page.nextPageToken;
      continue;
    }
    nextSyncToken = page.nextSyncToken ?? null;
    return { events, nextSyncToken };
  }
}

/**
 * Incremental sync of every selected calendar into the calendar_events
 * cache. Uses per-calendar sync tokens stored in meta.syncTokens; falls back
 * to a -30d/+90d window on first sync or an expired token. Cancelled events
 * are removed from the cache and any calendar_links pointing at them are
 * marked deleted. Never creates tasks (Orbit-created events carry the
 * extendedProperties.private.orbit="1" marker purely for loop prevention).
 */
export async function syncGoogleCalendars(
  userId: string,
  account: IntegrationAccount,
): Promise<{ synced: number; calendars: number }> {
  const db = admin();
  const calendarIds = selectedCalendarsOf(account);
  const syncTokens = syncTokensOf(account);
  const now = new Date().toISOString();

  let synced = 0;
  let calendarsDone = 0;

  for (const calendarId of calendarIds) {
    try {
      const { events, nextSyncToken } = await listCalendarChanges(
        account.id,
        calendarId,
        syncTokens[calendarId],
      );

      const cancelled = events.filter((e) => e.status === "cancelled" && e.id);
      const upserts = events.filter((e) => e.status !== "cancelled" && e.id);

      if (upserts.length > 0) {
        const { data: existingRows, error } = await db
          .from("calendar_events")
          .select("id, event_id")
          .eq("account_id", account.id)
          .eq("calendar_id", calendarId);
        if (error) throw new Error(error.message);
        const byEventId = new Map((existingRows ?? []).map((r) => [r.event_id, r.id]));

        for (const ev of upserts) {
          const row = mapGoogleEvent(userId, account.id, calendarId, ev);
          const existingId = byEventId.get(ev.id as string);
          if (existingId) {
            const { error: updateError } = await db
              .from("calendar_events")
              .update(row)
              .eq("id", existingId);
            if (updateError) throw new Error(updateError.message);
          } else {
            const { error: insertError } = await db.from("calendar_events").insert(row);
            if (insertError) throw new Error(insertError.message);
          }
        }
      }

      if (cancelled.length > 0) {
        const ids = cancelled.map((e) => e.id as string);
        const { error: deleteError } = await db
          .from("calendar_events")
          .delete()
          .eq("account_id", account.id)
          .eq("calendar_id", calendarId)
          .in("event_id", ids);
        if (deleteError) throw new Error(deleteError.message);

        // A linked google event was deleted remotely → mark the link deleted.
        await db
          .from("calendar_links")
          .update({ status: "deleted", updated_at: now })
          .eq("account_id", account.id)
          .eq("calendar_id", calendarId)
          .in("event_id", ids);
      }

      if (nextSyncToken) syncTokens[calendarId] = nextSyncToken;
      else delete syncTokens[calendarId];
      synced += events.length;
      calendarsDone += 1;
    } catch (e) {
      // Auth problems abort the whole sync; other per-calendar failures
      // (permissions, transient errors) skip the calendar.
      if (e instanceof GoogleError) throw e;
      console.error(`[google sync] calendar ${calendarId} failed`, e);
    }
  }

  const meta: Json = {
    ...metaOf(account.meta),
    syncTokens,
    lastSyncedAt: now,
  };
  await db
    .from("integration_accounts")
    .update({ meta, updated_at: now })
    .eq("id", account.id);

  return { synced, calendars: calendarsDone };
}

/**
 * Best-effort freshness check used by the events GET route: when the cache
 * looks older than 10 minutes, run a sync inline; failures are swallowed so
 * cached data is still served.
 */
export async function syncGoogleIfStale(userId: string): Promise<void> {
  try {
    const db = supabaseAdmin();
    if (!db) return;
    const account = await getGoogleAccount(userId).catch(() => null);
    if (!account) return;

    const { data: newest } = await db
      .from("calendar_events")
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSyncedAt = metaOf(account.meta).lastSyncedAt;
    const newestMs = Math.max(
      newest?.updated_at ? Date.parse(newest.updated_at) : 0,
      typeof lastSyncedAt === "string" ? Date.parse(lastSyncedAt) : 0,
    );
    if (Number.isFinite(newestMs) && Date.now() - newestMs <= 10 * 60 * 1000) return;

    await syncGoogleCalendars(userId, account);
  } catch (e) {
    console.error("[google sync-if-stale]", e);
  }
}
