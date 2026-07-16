import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/** Disconnect a Google account. Cached events and links go with it. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Server integrations are not configured yet" },
      { status: 503 },
    );
  }

  const { data: account, error } = await db
    .from("integration_accounts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("provider", "google")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Could not load account" }, { status: 500 });
  }
  if (!account) {
    return NextResponse.json({ error: "Google account not found" }, { status: 404 });
  }

  // Clean dependents explicitly so disconnect also works without
  // ON DELETE CASCADE on the FKs.
  await db.from("calendar_links").delete().eq("account_id", account.id);
  await db.from("calendar_events").delete().eq("account_id", account.id);
  await db.from("integration_secrets").delete().eq("account_id", account.id);
  const { error: deleteError } = await db
    .from("integration_accounts")
    .delete()
    .eq("id", account.id);
  if (deleteError) {
    return NextResponse.json({ error: "Could not disconnect Google account" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
