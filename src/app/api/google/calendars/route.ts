import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/lib/db/types";
import {
  getGoogleAccount,
  googleErrorResponse,
  googleFetch,
  metaOf,
  selectedCalendarsOf,
} from "@/lib/google/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

interface CalendarListResponse {
  items?: Array<{
    id?: string;
    summary?: string;
    backgroundColor?: string;
    primary?: boolean;
  }>;
}

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const account = await getGoogleAccount(user.id);
    const selected = selectedCalendarsOf(account);

    const res = await googleFetch(account.id, "/users/me/calendarList?maxResults=100");
    if (!res.ok) {
      return NextResponse.json({ error: "Could not list Google calendars" }, { status: 502 });
    }
    const data = (await res.json()) as CalendarListResponse;

    return NextResponse.json({
      calendars: (data.items ?? [])
        .filter((c) => c.id)
        .map((c) => ({
          id: c.id as string,
          summary: c.summary ?? "",
          backgroundColor: c.backgroundColor ?? null,
          primary: Boolean(c.primary),
          selected:
            selected.includes(c.id as string) ||
            (Boolean(c.primary) && selected.includes("primary")),
        })),
    });
  } catch (e) {
    return googleErrorResponse(e);
  }
}

/** PATCH {selectedCalendars: string[]} — choose which calendars to sync. */
export async function PATCH(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    selectedCalendars?: unknown;
    accountId?: unknown;
  } | null;
  const raw = body?.selectedCalendars;
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string" || v.length === 0)) {
    return NextResponse.json(
      { error: "selectedCalendars must be an array of calendar ids" },
      { status: 400 },
    );
  }
  const selectedCalendars = raw as string[];
  if (selectedCalendars.length === 0) {
    return NextResponse.json(
      { error: "Select at least one calendar" },
      { status: 400 },
    );
  }

  try {
    const account = await getGoogleAccount(
      user.id,
      typeof body?.accountId === "string" ? body.accountId : undefined,
    );
    const db = supabaseAdmin();
    if (!db) {
      return NextResponse.json(
        { error: "Server integrations are not configured yet" },
        { status: 503 },
      );
    }

    const meta: Json = { ...metaOf(account.meta), selectedCalendars };
    const { error } = await db
      .from("integration_accounts")
      .update({ meta, updated_at: new Date().toISOString() })
      .eq("id", account.id);
    if (error) {
      return NextResponse.json({ error: "Could not save calendar selection" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, selectedCalendars });
  } catch (e) {
    return googleErrorResponse(e);
  }
}
