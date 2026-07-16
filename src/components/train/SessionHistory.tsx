"use client";

import { useMemo, useState } from "react";
import {
  entrySummary,
  useAllEntries,
  useWorkoutSessions,
  type WorkoutEntry,
  type WorkoutSession,
} from "@/lib/data/fitness";
import { todayISO } from "@/lib/data/tasks";
import { splitLabel } from "@/components/train/TodaySession";
import { IconChevronDown, IconChevronRight } from "@/components/ui/Icons";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function SessionHistory() {
  const { data: sessions = [], isLoading } = useWorkoutSessions(40);
  const { data: allEntries = [] } = useAllEntries();
  const today = todayISO();

  const past = useMemo(() => sessions.filter((s) => s.date !== today), [sessions, today]);
  const entriesBySession = useMemo(() => {
    const map = new Map<string, WorkoutEntry[]>();
    for (const e of allEntries) {
      const list = map.get(e.session_id);
      if (list) list.push(e);
      else map.set(e.session_id, [e]);
    }
    // allEntries arrives newest first; entries read better oldest first
    for (const list of map.values()) list.reverse();
    return map;
  }, [allEntries]);

  return (
    <section className="surface p-5" aria-label="Session history">
      <p className="eyebrow mb-3">History</p>
      {isLoading ? (
        <p className="text-sm text-ink-faint">Loading</p>
      ) : past.length === 0 ? (
        <p className="text-sm text-ink-faint">Past sessions will collect here.</p>
      ) : (
        <ul>
          {past.map((s) => (
            <HistoryRow key={s.id} session={s} entries={entriesBySession.get(s.id) ?? []} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryRow({ session, entries }: { session: WorkoutSession; entries: WorkoutEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-t border-line first:border-t-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-2.5 text-left transition-colors duration-[var(--dur-base)] hover:text-ink"
      >
        <span className="text-ink-faint" aria-hidden>
          {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </span>
        <span className="tnum w-16 shrink-0 font-mono text-[12px] text-ink-faint">
          {fmtDate(session.date)}
        </span>
        <span className="flex-1 text-sm text-ink-dim">{splitLabel(session.split)}</span>
        <span className="tnum text-[12px] text-ink-faint">
          {entries.length} {entries.length === 1 ? "set" : "sets"}
          {session.duration_min != null ? ` · ${session.duration_min} min` : ""}
        </span>
      </button>
      {open && (
        <div className="mb-2.5 ml-7 rounded-xl border border-line bg-bg0/40 px-3.5 py-1">
          {entries.length === 0 ? (
            <p className="py-2 text-[13px] text-ink-faint">No sets were logged.</p>
          ) : (
            <ul>
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline gap-x-2 border-t border-line py-2 first:border-t-0"
                >
                  <span className="text-[13px] text-ink">{e.exercise_name}</span>
                  <span className="tnum text-[12px] text-ink-faint">set {e.set_number}</span>
                  <span className="tnum text-[13px] text-ink-dim">
                    {entrySummary(e)}
                    {e.rpe != null ? ` · RPE ${e.rpe}` : ""}
                  </span>
                  {e.is_pr && (
                    <span className="rounded-md bg-accent-soft px-1.5 py-px font-mono text-[10px] tracking-[0.08em] text-accent">
                      PR
                    </span>
                  )}
                  {e.form_note && (
                    <span className="w-full text-[12px] text-ink-faint">{e.form_note}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {session.notes && (
            <p className="border-t border-line py-2 text-[13px] text-ink-faint">{session.notes}</p>
          )}
        </div>
      )}
    </li>
  );
}
