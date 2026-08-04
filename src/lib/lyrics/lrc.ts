export interface SyncedLine {
  /** seconds from track start */
  t: number;
  line: string;
}

// One or more leading time tags ("[mm:ss.xx]", fraction optional, 2- or
// 3-digit fractions both seen in the wild), then the lyric text.
const TIMED_LINE = /^((?:\[\d{1,3}:\d{1,2}(?:\.\d{1,3})?\])+)(.*)$/;
const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;

/**
 * Parses LRC-format synced lyrics into {t, line} pairs sorted by time.
 * Metadata tags ("[ar:...]", "[ti:...]") and untimed lines are dropped;
 * a line with several time tags is emitted once per tag; empty lyric
 * lines (instrumental gaps) are kept so playback can rest on them.
 */
export function parseLrc(lrc: string): SyncedLine[] {
  const out: SyncedLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const m = raw.match(TIMED_LINE);
    if (!m) continue;
    const line = m[2].trim();
    for (const tag of m[1].matchAll(TIME_TAG)) {
      const frac = tag[3] ? Number(`0.${tag[3]}`) : 0;
      out.push({ t: Number(tag[1]) * 60 + Number(tag[2]) + frac, line });
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
