import { NextResponse } from "next/server";
import { parseLrc, type SyncedLine } from "@/lib/lyrics/lrc";

// Server-side proxy to LRCLIB so the browser never talks to a third party.
// Responses are cached in-memory per artist+title; a genuine "not found"
// caches too (it will not appear mid-song), but network failures do not.

interface LrclibRecord {
  trackName?: string | null;
  artistName?: string | null;
  duration?: number | null;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

interface LyricsPayload {
  synced: SyncedLine[] | null;
  plain: string | null;
}

const USER_AGENT = "Orbit/1.0 (personal dashboard)";
const CACHE_MAX = 200;
const cache = new Map<string, LyricsPayload>();

function remember(key: string, payload: LyricsPayload) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, payload);
}

function pickBest(
  items: LrclibRecord[],
  artist: string,
  title: string,
  durationS: number | null,
): LrclibRecord | null {
  const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();
  let best: LrclibRecord | null = null;
  let bestScore = -Infinity;
  for (const item of items) {
    let score = 0;
    if (norm(item.trackName) === norm(title)) score += 4;
    const a = norm(item.artistName);
    if (a && (a.includes(norm(artist)) || norm(artist).includes(a))) score += 3;
    if (item.syncedLyrics) score += 2;
    else if (item.plainLyrics) score += 1;
    if (durationS && item.duration) {
      score -= Math.min(2, Math.abs(item.duration - durationS) / 15);
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

async function lookup(
  artist: string,
  title: string,
  durationS: number | null,
): Promise<LrclibRecord | null> {
  const init: RequestInit = {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  };

  const params = new URLSearchParams({ artist_name: artist, track_name: title });
  if (durationS) params.set("duration", String(durationS));
  const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, init);
  if (res.ok) return (await res.json()) as LrclibRecord;
  if (res.status !== 404) throw new Error(`lrclib ${res.status}`);

  const search = await fetch(
    `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`)}`,
    init,
  );
  if (!search.ok) throw new Error(`lrclib search ${search.status}`);
  const items = (await search.json()) as LrclibRecord[];
  return pickBest(Array.isArray(items) ? items : [], artist, title, durationS);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const artist = url.searchParams.get("artist")?.trim() ?? "";
  const title = url.searchParams.get("title")?.trim() ?? "";
  const durationRaw = Number(url.searchParams.get("durationS"));
  const durationS =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null;

  if (!artist || !title) {
    return NextResponse.json({ error: "artist and title are required" }, { status: 400 });
  }

  const key = `${artist.toLowerCase()}::${title.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return NextResponse.json(hit);

  const empty: LyricsPayload = { synced: null, plain: null };
  try {
    const record = await lookup(artist, title, durationS);
    const synced = record?.syncedLyrics ? parseLrc(record.syncedLyrics) : null;
    const plain = record?.plainLyrics?.trim() ? record.plainLyrics : null;
    const payload: LyricsPayload = {
      synced: synced && synced.length > 0 ? synced : null,
      plain,
    };
    remember(key, payload);
    return NextResponse.json(payload);
  } catch {
    // network failure / timeout: report "no lyrics" but do not cache it
    return NextResponse.json(empty);
  }
}
