import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import type { Tables } from "@/lib/db/types";
import {
  getGoogleAccount,
  type GoogleEvent,
  googleErrorResponse,
  googleFetch,
  mapGoogleEvent,
  selectedCalendarsOf,
  syncGoogleIfStale,
} from "@/lib/google/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function toClientEvent(row: Tables<"calendar_events">) {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    color: row.color,
    calendarId: row.calendar_id,
  };
}

/** Exclusive end date for Google all-day events. */
function nextDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function requireUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---------------------------------------------------------------------------
// GET /api/google/events?range=today|week|month — serve from the local cache
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const range = new URL(request.url).searchParams.get("range") ?? "today";
  const now = new Date();
  const from = startOfDay(now);
  const to =
    range === "week"
      ? endOfDay(addDays(now, 6))
      : range === "month"
        ? endOfDay(addDays(now, 30))
        : endOfDay(now);

  // Refresh the cache when it looks stale; failures still serve cached data.
  await syncGoogleIfStale(user.id);

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "Could not load events" }, { status: 500 });
  }

  return NextResponse.json({ events: (data ?? []).map(toClientEvent) });
}

// ---------------------------------------------------------------------------
// POST — create an event in Google, cache it, optionally link it to a task
// ---------------------------------------------------------------------------

interface CreateBody {
  title?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  allDay?: unknown;
  calendarId?: unknown;
  description?: unknown;
  taskId?: unknown;
}

export async function POST(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof body.startsAt !== "string" || !body.startsAt) {
    return NextResponse.json({ error: "startsAt is required" }, { status: 400 });
  }
  const allDay = body.allDay === true;
  const endsAt = typeof body.endsAt === "string" && body.endsAt ? body.endsAt : null;

  try {
    const account = await getGoogleAccount(user.id);
    const db = supabaseAdmin();
    if (!db) {
      return NextResponse.json(
        { error: "Server integrations are not configured yet" },
        { status: 503 },
      );
    }

    const calendarId =
      typeof body.calendarId === "string" && body.calendarId
        ? body.calendarId
        : (selectedCalendarsOf(account)[0] ?? "primary");

    const payload: Record<string, unknown> = {
      summary: body.title.trim(),
      ...(typeof body.description === "string" && body.description
        ? { description: body.description }
        : {}),
      // Loop-prevention marker: sync recognizes Orbit-created events and
      // must never turn them back into tasks.
      extendedProperties: { private: { orbit: "1" } },
    };
    if (allDay) {
      const startDate = body.startsAt.slice(0, 10);
      const rawEnd = endsAt ? endsAt.slice(0, 10) : startDate;
      payload.start = { date: startDate };
      payload.end = { date: rawEnd > startDate ? rawEnd : nextDate(startDate) };
    } else {
      payload.start = { dateTime: body.startsAt };
      payload.end = {
        dateTime: endsAt ?? new Date(Date.parse(body.startsAt) + 60 * 60 * 1000).toISOString(),
      };
    }

    const res = await googleFetch(
      account.id,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      return NextResponse.json(
        { error: detail?.error?.message ?? "Google Calendar rejected the event" },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 },
      );
    }
    const created = (await res.json()) as GoogleEvent;
    if (!created.id) throw new Error("Google returned an event without an id");

    // Cache the new event immediately so it shows up without waiting for sync.
    const row = mapGoogleEvent(user.id, account.id, calendarId, created);
    const { data: cached, error: cacheError } = await db
      .from("calendar_events")
      .insert(row)
      .select("*")
      .single();
    if (cacheError || !cached) {
      throw new Error(cacheError?.message ?? "Could not cache the created event");
    }

    if (typeof body.taskId === "string" && body.taskId) {
      const { error: linkError } = await db.from("calendar_links").upsert(
        {
          user_id: user.id,
          task_id: body.taskId,
          account_id: account.id,
          calendar_id: calendarId,
          event_id: created.id,
          etag: created.etag ?? null,
          status: "linked",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "task_id" },
      );
      if (linkError) {
        console.error("[google events] could not link task", linkError.message);
      }
    }

    return NextResponse.json({ event: toClientEvent(cached) }, { status: 201 });
  } catch (e) {
    return googleErrorResponse(e);
  }
}

// ---------------------------------------------------------------------------
// PATCH {eventId, calendarId, ...fields} — update in Google + cache
// ---------------------------------------------------------------------------

interface PatchBody {
  eventId?: unknown;
  calendarId?: unknown;
  title?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  allDay?: unknown;
  description?: unknown;
}

export async function PATCH(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body || typeof body.eventId !== "string" || typeof body.calendarId !== "string") {
    return NextResponse.json({ error: "eventId and calendarId are required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.summary = body.title;
  if (typeof body.description === "string") patch.description = body.description;
  const allDay = body.allDay === true;
  if (typeof body.startsAt === "string" && body.startsAt) {
    patch.start = allDay ? { date: body.startsAt.slice(0, 10) } : { dateTime: body.startsAt };
  }
  if (typeof body.endsAt === "string" && body.endsAt) {
    patch.end = allDay ? { date: body.endsAt.slice(0, 10) } : { dateTime: body.endsAt };
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const account = await getGoogleAccount(user.id);
    const db = supabaseAdmin();
    if (!db) {
      return NextResponse.json(
        { error: "Server integrations are not configured yet" },
        { status: 503 },
      );
    }

    const res = await googleFetch(
      account.id,
      `/calendars/${encodeURIComponent(body.calendarId)}/events/${encodeURIComponent(body.eventId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    if (res.status === 404) {
      return NextResponse.json({ error: "Event not found in Google Calendar" }, { status: 404 });
    }
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      return NextResponse.json(
        { error: detail?.error?.message ?? "Google Calendar rejected the update" },
        { status: res.status >= 400 && res.status < 500 ? res.status : 502 },
      );
    }
    const updated = (await res.json()) as GoogleEvent;

    // Mirror the change into the cache.
    const row = mapGoogleEvent(user.id, account.id, body.calendarId, updated);
    const { data: existing } = await db
      .from("calendar_events")
      .select("id")
      .eq("account_id", account.id)
      .eq("calendar_id", body.calendarId)
      .eq("event_id", body.eventId)
      .maybeSingle();
    let cached: Tables<"calendar_events"> | null = null;
    if (existing) {
      const { data } = await db
        .from("calendar_events")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single();
      cached = data;
    } else {
      const { data } = await db.from("calendar_events").insert(row).select("*").single();
      cached = data;
    }

    // Keep the task link's etag current when this event is Orbit-linked.
    if (updated.etag) {
      await db
        .from("calendar_links")
        .update({ etag: updated.etag, updated_at: new Date().toISOString() })
        .eq("account_id", account.id)
        .eq("calendar_id", body.calendarId)
        .eq("event_id", body.eventId);
    }

    return NextResponse.json({ event: cached ? toClientEvent(cached) : null });
  } catch (e) {
    return googleErrorResponse(e);
  }
}

// ---------------------------------------------------------------------------
// DELETE {eventId, calendarId, force?} — Orbit-created events only, unless
// the UI explicitly passes force=true
// ---------------------------------------------------------------------------

interface DeleteBody {
  eventId?: unknown;
  calendarId?: unknown;
  force?: unknown;
}

export async function DELETE(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as DeleteBody | null;
  if (!body || typeof body.eventId !== "string" || typeof body.calendarId !== "string") {
    return NextResponse.json({ error: "eventId and calendarId are required" }, { status: 400 });
  }

  try {
    const account = await getGoogleAccount(user.id);
    const db = supabaseAdmin();
    if (!db) {
      return NextResponse.json(
        { error: "Server integrations are not configured yet" },
        { status: 503 },
      );
    }

    const { data: link } = await db
      .from("calendar_links")
      .select("id")
      .eq("user_id", user.id)
      .eq("account_id", account.id)
      .eq("calendar_id", body.calendarId)
      .eq("event_id", body.eventId)
      .maybeSingle();

    if (!link && body.force !== true) {
      return NextResponse.json(
        { error: "Only events created by Orbit can be deleted. Pass force to delete anyway." },
        { status: 403 },
      );
    }

    const res = await googleFetch(
      account.id,
      `/calendars/${encodeURIComponent(body.calendarId)}/events/${encodeURIComponent(body.eventId)}`,
      { method: "DELETE" },
    );
    // 404/410 mean it is already gone remotely — still clean up locally.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const detail = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      return NextResponse.json(
        { error: detail?.error?.message ?? "Google Calendar refused to delete the event" },
        { status: 502 },
      );
    }

    await db
      .from("calendar_events")
      .delete()
      .eq("account_id", account.id)
      .eq("calendar_id", body.calendarId)
      .eq("event_id", body.eventId);

    if (link) {
      await db
        .from("calendar_links")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("id", link.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return googleErrorResponse(e);
  }
}
