"use client";

import {
  fmtDistance,
  fmtPace,
  fmtSeconds,
  fmtWeight,
  usePersonalRecords,
  type ExercisePR,
} from "@/lib/data/fitness";

function bests(r: ExercisePR): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  if (r.maxWeight) {
    out.push({
      value:
        r.maxWeight.reps != null
          ? `${fmtWeight(r.maxWeight.weightKg)} x ${r.maxWeight.reps}`
          : fmtWeight(r.maxWeight.weightKg),
      label: "top weight",
    });
  }
  if (r.maxReps != null) out.push({ value: String(r.maxReps), label: "reps" });
  if (r.maxHold != null) out.push({ value: fmtSeconds(r.maxHold), label: "hold" });
  if (r.bestDistance != null) out.push({ value: fmtDistance(r.bestDistance), label: "distance" });
  if (r.bestPace) out.push({ value: fmtPace(r.bestPace.secondsPerKm), label: "pace" });
  return out;
}

export function Records() {
  const { records, hasEntries, isLoading } = usePersonalRecords();
  const withBests = records.filter((r) => bests(r).length > 0);

  return (
    <section className="surface p-5" aria-label="Personal records">
      <p className="eyebrow mb-3">Records</p>
      {isLoading ? (
        <p className="text-sm text-ink-faint">Loading</p>
      ) : !hasEntries || withBests.length === 0 ? (
        <p className="font-mono text-[12px] text-ink-faint">—</p>
      ) : (
        <ul>
          {withBests.map((r) => (
            <li
              key={r.exerciseId}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-2.5 first:border-t-0"
            >
              <span className="text-sm text-ink">{r.exerciseName}</span>
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                {bests(r).map((b) => (
                  <span key={b.label} className="whitespace-nowrap">
                    <span className="tnum text-sm text-ink-dim">{b.value}</span>{" "}
                    <span className="text-[11px] text-ink-faint">{b.label}</span>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
