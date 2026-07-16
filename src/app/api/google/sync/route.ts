import { NextResponse, type NextRequest } from "next/server";
import {
  getGoogleAccount,
  googleErrorResponse,
  syncGoogleCalendars,
} from "@/lib/google/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Incrementally sync all selected calendars into the local cache. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { accountId?: unknown } | null;

  try {
    const account = await getGoogleAccount(
      user.id,
      typeof body?.accountId === "string" ? body.accountId : undefined,
    );
    const { synced, calendars } = await syncGoogleCalendars(user.id, account);
    return NextResponse.json({ synced, calendars });
  } catch (e) {
    return googleErrorResponse(e);
  }
}
