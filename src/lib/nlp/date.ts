// Natural-language date entry: "physics test friday", "call mom tomorrow
// 3pm", "renew passport aug 12". The date phrase is stripped from the
// title; unrecognized text is left alone.

export interface ParsedEntry {
  title: string;
  /** YYYY-MM-DD */
  dueDate: string | null;
  /** ISO datetime when a time was given */
  scheduledAt: string | null;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function matchWeekday(word: string): number | null {
  if (word.length < 3) return null;
  const idx = WEEKDAYS.findIndex((w) => w.startsWith(word));
  return idx >= 0 ? idx : null;
}

function matchMonth(word: string): number | null {
  if (word.length < 3) return null;
  const idx = MONTHS.findIndex((m) => m.startsWith(word));
  return idx >= 0 ? idx : null;
}

function parseTimeToken(token: string): { h: number; m: number } | null {
  let m = token.match(/^(\d{1,2}):(\d{2})(am|pm)?$/i);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const suffix = m[3]?.toLowerCase();
    if (suffix === "pm" && h < 12) h += 12;
    if (suffix === "am" && h === 12) h = 0;
    return h < 24 && min < 60 ? { h, m: min } : null;
  }
  m = token.match(/^(\d{1,2})(am|pm)$/i);
  if (m) {
    let h = Number(m[1]);
    const suffix = m[2].toLowerCase();
    if (suffix === "pm" && h < 12) h += 12;
    if (suffix === "am" && h === 12) h = 0;
    return h < 24 ? { h, m: 0 } : null;
  }
  return null;
}

/**
 * Parses a trailing date/time phrase out of `input`, relative to `now`.
 * Recognized: today, tomorrow, tod/tmr, weekday names ("fri"), "next
 * <weekday>", "in N days", "<month> <day>", "<day> <month>", plus an
 * optional trailing time ("3pm", "15:30").
 */
export function parseEntry(input: string, now = new Date()): ParsedEntry {
  const words = input.trim().split(/\s+/);
  if (words.length === 0 || (words.length === 1 && !words[0])) {
    return { title: input.trim(), dueDate: null, scheduledAt: null };
  }

  let time: { h: number; m: number } | null = null;
  let date: Date | null = null;
  let consumed = 0;

  const peek = (offset: number) => words[words.length - 1 - offset]?.toLowerCase();

  // trailing time token first ("… friday 3pm")
  const t0 = peek(0) ? parseTimeToken(peek(0)) : null;
  if (t0 && words.length > 1) {
    time = t0;
    consumed = 1;
  }

  const last = peek(consumed);
  const prev = peek(consumed + 1);

  const dayAt = (base: Date, addDays: number) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + addDays);
    return d;
  };

  if (last === "today" || last === "tod") {
    date = dayAt(now, 0);
    consumed += 1;
  } else if (last === "tomorrow" || last === "tmr" || last === "tmrw") {
    date = dayAt(now, 1);
    consumed += 1;
  } else if (last && matchWeekday(last) !== null && words.length - consumed > 1) {
    const target = matchWeekday(last)!;
    const isNext = prev === "next";
    const base = (target - now.getDay() + 7) % 7;
    // "friday" on a Friday means the coming one; "next friday" skips a week
    const delta = isNext ? (base === 0 ? 7 : base + 7) : base === 0 ? 7 : base;
    date = dayAt(now, delta);
    consumed += isNext ? 2 : 1;
  } else if (last === "week" && prev === "next") {
    date = dayAt(now, 7);
    consumed += 2;
  } else if (last === "days" && prev && /^\d{1,3}$/.test(prev) && peek(consumed + 2) === "in") {
    date = dayAt(now, Number(prev));
    consumed += 3;
  } else if (last && prev) {
    // "<month> <day>" or "<day> <month>"
    const dayNum = last.match(/^(\d{1,2})(st|nd|rd|th)?$/);
    const monthIdx = matchMonth(prev);
    const dayNum2 = prev.match(/^(\d{1,2})(st|nd|rd|th)?$/);
    const monthIdx2 = last ? matchMonth(last) : null;
    if (dayNum && monthIdx !== null) {
      date = new Date(now.getFullYear(), monthIdx, Number(dayNum[1]));
      consumed += 2;
    } else if (dayNum2 && monthIdx2 !== null) {
      date = new Date(now.getFullYear(), monthIdx2, Number(dayNum2[1]));
      consumed += 2;
    }
    if (date && date < dayAt(now, 0)) date.setFullYear(date.getFullYear() + 1);
  }

  if (!date) {
    // a bare time still schedules for today
    if (time) {
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.h, time.m);
      return {
        title: words.slice(0, words.length - 1).join(" "),
        dueDate: iso(scheduled),
        scheduledAt: scheduled.toISOString(),
      };
    }
    return { title: input.trim(), dueDate: null, scheduledAt: null };
  }

  const title = words.slice(0, words.length - consumed).join(" ");
  if (time) {
    const scheduled = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.h, time.m);
    return { title, dueDate: iso(date), scheduledAt: scheduled.toISOString() };
  }
  return { title, dueDate: iso(date), scheduledAt: null };
}
