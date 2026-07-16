import { NextResponse, type NextRequest } from "next/server";
import { getSpotifyAccount, spotifyErrorResponse, spotifyFetch } from "@/lib/spotify/server";
import { supabaseServer } from "@/lib/supabase/server";

const ACTIONS = ["play", "pause", "next", "previous", "volume", "transfer", "playUri"] as const;
type Action = (typeof ACTIONS)[number];

interface ControlBody {
  action?: unknown;
  volume?: unknown;
  deviceId?: unknown;
  uri?: unknown;
  accountId?: unknown;
}

interface SpotifyApiError {
  error?: { status?: number; message?: string; reason?: string };
}

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as ControlBody | null;
  const action = body?.action;
  if (typeof action !== "string" || !ACTIONS.includes(action as Action)) {
    return NextResponse.json(
      { error: `action must be one of: ${ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : undefined;
  const deviceQuery = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";

  let path: string;
  let method: "PUT" | "POST" = "PUT";
  let payload: Record<string, unknown> | undefined;

  switch (action as Action) {
    case "play":
      path = `/me/player/play${deviceQuery}`;
      break;
    case "playUri": {
      if (typeof body?.uri !== "string" || !body.uri) {
        return NextResponse.json({ error: "playUri requires a uri" }, { status: 400 });
      }
      path = `/me/player/play${deviceQuery}`;
      // Tracks/episodes are queued as uris; playlists/albums/artists as context.
      payload =
        body.uri.startsWith("spotify:track:") || body.uri.startsWith("spotify:episode:")
          ? { uris: [body.uri] }
          : { context_uri: body.uri };
      break;
    }
    case "pause":
      path = `/me/player/pause${deviceQuery}`;
      break;
    case "next":
      path = `/me/player/next${deviceQuery}`;
      method = "POST";
      break;
    case "previous":
      path = `/me/player/previous${deviceQuery}`;
      method = "POST";
      break;
    case "volume": {
      if (typeof body?.volume !== "number" || !Number.isFinite(body.volume)) {
        return NextResponse.json({ error: "volume requires a numeric volume" }, { status: 400 });
      }
      const v = Math.max(0, Math.min(100, Math.round(body.volume)));
      path = `/me/player/volume?volume_percent=${v}${deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : ""}`;
      break;
    }
    case "transfer": {
      if (!deviceId) {
        return NextResponse.json({ error: "transfer requires a deviceId" }, { status: 400 });
      }
      path = "/me/player";
      payload = { device_ids: [deviceId], play: true };
      break;
    }
  }

  try {
    const account = await getSpotifyAccount(
      user.id,
      typeof body?.accountId === "string" ? body.accountId : undefined,
    );
    const res = await spotifyFetch(account.id, path, {
      method,
      ...(payload
        ? { body: JSON.stringify(payload), headers: { "content-type": "application/json" } }
        : {}),
    });

    if (res.ok || res.status === 204) return NextResponse.json({ ok: true });

    const err = (await res.json().catch(() => null)) as SpotifyApiError | null;
    const reason = err?.error?.reason;

    if (res.status === 404 || reason === "NO_ACTIVE_DEVICE") {
      return NextResponse.json(
        { error: "No active Spotify device. Open Spotify anywhere or use the web player." },
        { status: 409 },
      );
    }
    if (res.status === 403) {
      return NextResponse.json(
        {
          error:
            reason === "PREMIUM_REQUIRED"
              ? "Spotify Premium is required to control playback from Orbit."
              : (err?.error?.message ?? "Spotify refused this action for your account."),
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: err?.error?.message ?? "Spotify playback control failed" },
      { status: 502 },
    );
  } catch (e) {
    return spotifyErrorResponse(e);
  }
}
