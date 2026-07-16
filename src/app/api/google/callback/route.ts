import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/db/types";
import { env, integrationStatus } from "@/lib/env";
import {
  exchangeGoogleCode,
  fetchGoogleUserinfo,
  GOOGLE_SCOPES,
  metaOf,
} from "@/lib/google/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const STATE_COOKIE = "google_oauth_state";

function redirectTo(params: Record<string, string>) {
  const res = NextResponse.redirect(
    new URL(`/space/connections?${new URLSearchParams(params).toString()}`, env.appUrl),
  );
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return redirectTo({
      error:
        oauthError === "access_denied"
          ? "Google connection was cancelled."
          : "Google sign-in failed. Please try again.",
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectTo({ error: "Sign-in state did not match. Please try connecting again." });
  }

  if (!integrationStatus.google) {
    return redirectTo({ error: "Google Calendar is not configured on the server yet." });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirectTo({ error: "You need to be signed in to connect Google Calendar." });

  const db = supabaseAdmin();
  if (!db) return redirectTo({ error: "Server integrations are not configured yet." });

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserinfo(tokens.accessToken);

    const { data: existing, error: listError } = await db
      .from("integration_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google");
    if (listError) throw new Error(listError.message);

    const accounts = existing ?? [];
    const current = accounts.find((a) => a.external_id === profile.sub);
    const activeFlag = current ? metaOf(current.meta).active === true : accounts.length === 0;

    const label = profile.name || profile.email || "Google";
    const scopes = GOOGLE_SCOPES.split(" ");
    const now = new Date().toISOString();
    let accountId: string;

    if (current) {
      // Reconnect: keep the calendar selection and sync state.
      const currentMeta = metaOf(current.meta);
      const meta: Json = {
        ...currentMeta,
        active: activeFlag,
        selectedCalendars: Array.isArray(currentMeta.selectedCalendars)
          ? currentMeta.selectedCalendars
          : ["primary"],
      };
      const { error } = await db
        .from("integration_accounts")
        .update({
          label,
          email: profile.email ?? "",
          scopes,
          is_active: true,
          meta,
          updated_at: now,
        })
        .eq("id", current.id);
      if (error) throw new Error(error.message);
      accountId = current.id;
    } else {
      const meta: Json = { active: activeFlag, selectedCalendars: ["primary"] };
      const { data: inserted, error } = await db
        .from("integration_accounts")
        .insert({
          user_id: user.id,
          provider: "google",
          external_id: profile.sub,
          label,
          email: profile.email ?? "",
          scopes,
          is_active: true,
          meta,
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "Could not save Google account");
      accountId = inserted.id;
    }

    // Google omits the refresh token on repeat consents; keep the stored one.
    let refreshToken = tokens.refreshToken;
    if (!refreshToken) {
      const { data: secret } = await db
        .from("integration_secrets")
        .select("refresh_token")
        .eq("account_id", accountId)
        .maybeSingle();
      refreshToken = secret?.refresh_token || null;
    }
    if (!refreshToken) {
      throw new Error("Google did not return a refresh token");
    }

    const { error: secretError } = await db.from("integration_secrets").upsert(
      {
        account_id: accountId,
        user_id: user.id,
        access_token: tokens.accessToken,
        refresh_token: refreshToken,
        expires_at: tokens.expiresAt,
        updated_at: now,
      },
      { onConflict: "account_id" },
    );
    if (secretError) throw new Error(secretError.message);

    return redirectTo({ connected: "google" });
  } catch (e) {
    console.error("[google callback]", e);
    return redirectTo({ error: "Could not finish connecting Google Calendar. Please try again." });
  }
}
