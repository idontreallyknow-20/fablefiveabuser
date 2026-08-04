// Lightweight task recurrence: freq/interval/weekday, expanded client-side
// over a bounded window. Deliberately not RRULE.

export interface Recurrence {
  freq: "daily" | "weekly" | "monthly";
  /** every N days/weeks/months */
  interval: number;
  /** weekly only: 0 (Sun) .. 6 (Sat); empty means the anchor's weekday */
  weekdays?: number[];
  /** stop date inclusive, YYYY-MM-DD */
  until?: string | null;
}

export function parseRecurrence(v: unknown): Recurrence | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (r.freq !== "daily" && r.freq !== "weekly" && r.freq !== "monthly") return null;
  const interval = Number(r.interval);
  return {
    freq: r.freq,
    interval: Number.isFinite(interval) && interval >= 1 ? Math.floor(interval) : 1,
    weekdays: Array.isArray(r.weekdays)
      ? r.weekdays.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
      : undefined,
    until: typeof r.until === "string" ? r.until : null,
  };
}

const DAY_MS = 86_400_000;

function toUTC(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Occurrence dates of a recurrence anchored at `anchor`, intersected with
 * [from, to] inclusive. Bounded to 120 occurrences as a safety cap.
 */
export function expandRecurrence(
  rec: Recurrence,
  anchor: string,
  from: string,
  to: string,
): string[] {
  const out: string[] = [];
  const anchorMs = toUTC(anchor);
  const fromMs = Math.max(toUTC(from), anchorMs);
  const toMs = Math.min(toUTC(to), rec.until ? toUTC(rec.until) : Infinity);
  if (fromMs > toMs) return out;

  if (rec.freq === "daily") {
    const step = rec.interval * DAY_MS;
    // first occurrence >= from that is aligned to the anchor
    const offset = Math.max(0, Math.ceil((fromMs - anchorMs) / step));
    for (let ms = anchorMs + offset * step; ms <= toMs && out.length < 120; ms += step) {
      out.push(fromUTC(ms));
    }
    return out;
  }

  if (rec.freq === "weekly") {
    const anchorDow = new Date(anchorMs).getUTCDay();
    const days = rec.weekdays && rec.weekdays.length > 0 ? rec.weekdays : [anchorDow];
    // walk week by week from the anchor's week start
    const anchorWeekStart = anchorMs - anchorDow * DAY_MS;
    const stepMs = rec.interval * 7 * DAY_MS;
    const firstWeek =
      anchorWeekStart +
      Math.max(0, Math.floor((fromMs - anchorWeekStart) / stepMs)) * stepMs;
    for (let week = firstWeek; week <= toMs && out.length < 120; week += stepMs) {
      for (const dow of [...days].sort()) {
        const ms = week + dow * DAY_MS;
        if (ms >= anchorMs && ms >= fromMs && ms <= toMs) out.push(fromUTC(ms));
        if (out.length >= 120) break;
      }
    }
    return out;
  }

  // monthly: same day-of-month as the anchor; months without it are skipped
  const a = new Date(anchorMs);
  const dom = a.getUTCDate();
  for (let i = 0; out.length < 120; i += rec.interval) {
    const y = a.getUTCFullYear();
    const m = a.getUTCMonth() + i;
    const ms = Date.UTC(y, m, dom);
    if (ms > toMs) break;
    if (new Date(ms).getUTCDate() !== dom) continue; // rolled over (e.g. Feb 31)
    if (ms >= fromMs && ms >= anchorMs) out.push(fromUTC(ms));
  }
  return out;
}

export function describeRecurrence(rec: Recurrence | null): string {
  if (!rec) return "";
  const every = rec.interval > 1 ? `${rec.interval}` : "";
  if (rec.freq === "daily") return rec.interval > 1 ? `every ${every} days` : "daily";
  if (rec.freq === "monthly") return rec.interval > 1 ? `every ${every} months` : "monthly";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = (rec.weekdays ?? []).map((d) => names[d]).join(" ");
  const base = rec.interval > 1 ? `every ${every} weeks` : "weekly";
  return days ? `${base} · ${days}` : base;
}
