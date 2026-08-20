import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Signup gate. Registration is allowed when PUBLIC_SIGNUPS_ENABLED=true, or
 * for the very first account (bootstrap) so the owner can get in.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = (body.displayName ?? "").trim().slice(0, 60);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey);

  if (!env.publicSignupsEnabled) {
    const { data: count, error } = await anon.rpc("profile_count");
    if (error) {
      return NextResponse.json({ error: "Could not verify signup availability" }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "New accounts are not open yet" },
        { status: 403 },
      );
    }
  }

  // with the service role available, create the account pre-confirmed so no
  // confirmation email is needed; otherwise fall back to the standard flow
  const admin = supabaseAdmin();
  if (admin) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ needsConfirmation: false });
  }

  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    needsConfirmation: !data.session,
  });
}

export async function GET() {
  // signup availability for the login screen
  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey);
  if (env.publicSignupsEnabled) {
    return NextResponse.json({ open: true });
  }
  const { data: count, error } = await anon.rpc("profile_count");
  if (error) {
    // fail closed: registration stays hidden if availability is unknown
    return NextResponse.json({ open: false, unavailable: true });
  }
  return NextResponse.json({ open: (count ?? 0) === 0, bootstrap: (count ?? 0) === 0 });
}
