import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/db/types";
import { metaOf } from "@/lib/spotify/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

async function requireOwnedAccount(id: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) } as const;
  }

  const db = supabaseAdmin();
  if (!db) {
    return {
      response: NextResponse.json(
        { error: "Server integrations are not configured yet" },
        { status: 503 },
      ),
    } as const;
  }

  const { data: account, error } = await db
    .from("integration_accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("provider", "spotify")
    .maybeSingle();
  if (error) {
    return {
      response: NextResponse.json({ error: "Could not load account" }, { status: 500 }),
    } as const;
  }
  if (!account) {
    return {
      response: NextResponse.json({ error: "Spotify account not found" }, { status: 404 }),
    } as const;
  }

  return { user, db, account } as const;
}

/** Disconnect: remove the account (secrets are removed alongside it). */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const ctx = await requireOwnedAccount(id);
  if ("response" in ctx) return ctx.response;
  const { db, account } = ctx;

  // Explicitly clear secrets first so disconnect works even without an
  // ON DELETE CASCADE on the FK.
  await db.from("integration_secrets").delete().eq("account_id", account.id);
  const { error } = await db.from("integration_accounts").delete().eq("id", account.id);
  if (error) {
    return NextResponse.json({ error: "Could not disconnect Spotify account" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** PATCH {active?: true, label?: string} — switch active profile / rename. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const ctx = await requireOwnedAccount(id);
  if ("response" in ctx) return ctx.response;
  const { user, db, account } = ctx;

  const body = (await request.json().catch(() => null)) as {
    active?: unknown;
    label?: unknown;
  } | null;
  if (!body || (body.active === undefined && body.label === undefined)) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (body.label !== undefined && typeof body.label !== "string") {
    return NextResponse.json({ error: "label must be a string" }, { status: 400 });
  }
  if (body.active !== undefined && body.active !== true) {
    return NextResponse.json({ error: "active can only be set to true" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (body.active === true) {
    // Exclusively activate this profile: flip siblings off, this one on.
    const { data: siblings, error } = await db
      .from("integration_accounts")
      .select("id, meta")
      .eq("user_id", user.id)
      .eq("provider", "spotify");
    if (error) {
      return NextResponse.json({ error: "Could not update accounts" }, { status: 500 });
    }
    for (const sibling of siblings ?? []) {
      const meta: Json = { ...metaOf(sibling.meta), active: sibling.id === account.id };
      const { error: updateError } = await db
        .from("integration_accounts")
        .update({ meta, updated_at: now })
        .eq("id", sibling.id);
      if (updateError) {
        return NextResponse.json({ error: "Could not switch active account" }, { status: 500 });
      }
    }
  }

  if (typeof body.label === "string") {
    const { error } = await db
      .from("integration_accounts")
      .update({ label: body.label, updated_at: now })
      .eq("id", account.id);
    if (error) {
      return NextResponse.json({ error: "Could not update label" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
