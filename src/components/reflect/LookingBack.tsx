"use client";

import { useMemo } from "react";
import { useCheckins, useJournalEntries, type Checkin } from "@/lib/data/selfcare";

const ROWS: { key: "mood" | "energy" | "stress" | "sleep_quality"; label: string }[] = [
  { key: "mood", label: "mood" },
  { key: "energy", label: "energy" },
  { key: "stress", label: "stress" },
  { key: "sleep_quality", label: "sleep" },
];

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function dotOpacity(value: number | null): number {
  if (value == null) return 0.07;
  return 0.14 + ((value - 1) / 4) * 0.76;
}

function columnLabel(date: string, checkin: Checkin | undefined): string {
  const [y, m, d] = date.split("-").map(Number);
  const nice = new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
  if (!checkin) return `${nice}: no check-in`;
  const parts = ROWS.map((r) => {
    const v = checkin[r.key];
    return v != null ? `${r.label} ${v} of 5` : `${r.label} not set`;
  });
  return `${nice}: ${parts.join(", ")}`;
}

export function LookingBack() {
  const { data: checkins = [], isLoading } = useCheckins(14);
  const { data: journal = [] } = useJournalEntries(8);

  const days = useMemo(() => {
    const byDate = new Map(checkins.map((c) => [c.date, c]));
    return lastNDates(14).map((date) => ({ date, checkin: byDate.get(date) }));
  }, [checkins]);

  const anyCheckin = checkins.length > 0;

  return (
    <section className="surface p-5" aria-label="Looking back">
      <p className="eyebrow mb-3">Looking back</p>

      {isLoading ? (
        <p className="text-sm text-ink-faint">Loading</p>
      ) : anyCheckin ? (
        <>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-2.5">
              {days.map(({ date, checkin }) => (
                <div
                  key={date}
                  role="img"
                  aria-label={columnLabel(date, checkin)}
                  className="flex flex-col items-center gap-1.5"
                >
                  {ROWS.map((r) => (
                    <span
                      key={r.key}
                      aria-hidden
                      className="block h-2 w-2 rounded-full bg-ink"
                      style={{ opacity: dotOpacity(checkin ? checkin[r.key] : null) }}
                    />
                  ))}
                  <span className="tnum mt-0.5 font-mono text-[10px] text-ink-faint" aria-hidden>
                    {Number(date.slice(8, 10))}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint" aria-hidden>
            Rows, top to bottom: mood, energy, stress, sleep.
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-faint">Check-ins will gather here quietly.</p>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-[13px] font-medium text-ink-dim">Recent journal</p>
        {journal.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {journal.map((j) => (
              <li key={j.id}>
                <p className="tnum mb-0.5 font-mono text-[11px] text-ink-faint">{j.date}</p>
                <p className="whitespace-pre-wrap text-sm text-ink-dim">{j.note}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">No journal entries yet.</p>
        )}
      </div>
    </section>
  );
}
