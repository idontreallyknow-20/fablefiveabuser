"use client";

import { useMemo, useState } from "react";
import { localDb } from "@/lib/local/client";
import { todayISO } from "@/lib/data/tasks";
import { useSettings } from "@/lib/settings/store";
import { Segmented, Toggle } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const CATEGORIES = [
  { key: "priorities", label: "Today's priorities", sensitive: false, default: true },
  { key: "backlog", label: "Backlog tasks", sensitive: false, default: true },
  { key: "projects", label: "Projects", sensitive: false, default: true },
  { key: "calendar", label: "Today's calendar", sensitive: false, default: true },
  { key: "routines", label: "Routines", sensitive: false, default: false },
  { key: "workouts", label: "Recent workouts", sensitive: false, default: false },
  { key: "checkins", label: "Mental check-ins", sensitive: true, default: false },
  { key: "journal", label: "Journal entries", sensitive: true, default: false },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

async function collect(selected: Set<CategoryKey>): Promise<string> {
  const supabase = localDb();
  const today = todayISO();
  const parts: string[] = [];

  parts.push(
    "You are helping me plan my day. Below is a snapshot from Orbit, my personal dashboard. " +
      "Suggest which three tasks should be today's priorities and in what order, with brief reasoning. " +
      "Keep the plan realistic for one person in one day.",
  );
  parts.push(`Date: ${today}`);

  if (selected.has("priorities")) {
    const { data } = await supabase
      .from("tasks")
      .select("title, note, completed_at, priority_slot")
      .eq("priority_date", today)
      .not("priority_slot", "is", null)
      .order("priority_slot");
    parts.push(
      "## Current priorities\n" +
        ((data ?? []).map((t) => `${t.priority_slot}. ${t.title}${t.completed_at ? " (done)" : ""}`).join("\n") ||
          "None chosen yet"),
    );
  }
  if (selected.has("backlog")) {
    const { data } = await supabase
      .from("tasks")
      .select("title, due_date, importance, duration_min, deferral_count")
      .is("completed_at", null)
      .is("priority_slot", null)
      .order("created_at", { ascending: false })
      .limit(30);
    parts.push(
      "## Backlog\n" +
        ((data ?? [])
          .map(
            (t) =>
              `- ${t.title}` +
              (t.due_date ? ` (due ${t.due_date})` : "") +
              (t.importance === 3 ? " [important]" : "") +
              (t.duration_min ? ` [~${t.duration_min}m]` : "") +
              (t.deferral_count > 1 ? ` [deferred ${t.deferral_count}x]` : ""),
          )
          .join("\n") || "Empty"),
    );
  }
  if (selected.has("projects")) {
    const { data } = await supabase
      .from("projects")
      .select("name, priority, kind")
      .eq("archived", false);
    parts.push(
      "## Projects\n" +
        ((data ?? []).map((p) => `- ${p.name} (priority ${p.priority})`).join("\n") || "None"),
    );
  }
  if (selected.has("calendar")) {
    const { data } = await supabase
      .from("tasks")
      .select("title, scheduled_at")
      .gte("scheduled_at", `${today}T00:00:00`)
      .lte("scheduled_at", `${today}T23:59:59`)
      .order("scheduled_at");
    const hhmm = (iso: string | null) =>
      iso ? new Date(iso).toTimeString().slice(0, 5) : "";
    parts.push(
      "## Today's calendar\n" +
        ((data ?? []).map((e) => `- ${hhmm(e.scheduled_at)} ${e.title}`).join("\n") ||
          "Nothing scheduled"),
    );
  }
  if (selected.has("routines")) {
    const { data } = await supabase.from("routines").select("name, enabled").eq("enabled", true);
    parts.push("## Routines\n" + ((data ?? []).map((r) => `- ${r.name}`).join("\n") || "None"));
  }
  if (selected.has("workouts")) {
    const { data } = await supabase
      .from("workout_sessions")
      .select("date, split")
      .order("date", { ascending: false })
      .limit(5);
    parts.push(
      "## Recent workouts\n" +
        ((data ?? []).map((w) => `- ${w.date}: ${w.split || "session"}`).join("\n") || "None"),
    );
  }
  if (selected.has("checkins")) {
    const { data } = await supabase
      .from("checkins")
      .select("date, mood, energy, stress, sleep_quality")
      .order("date", { ascending: false })
      .limit(7);
    parts.push(
      "## Mental check-ins (1-5 scales)\n" +
        ((data ?? [])
          .map(
            (c) =>
              `- ${c.date}: mood ${c.mood ?? "-"}, energy ${c.energy ?? "-"}, stress ${c.stress ?? "-"}, sleep ${c.sleep_quality ?? "-"}`,
          )
          .join("\n") || "None"),
    );
  }
  if (selected.has("journal")) {
    const { data } = await supabase
      .from("selfcare_logs")
      .select("date, note")
      .eq("kind", "journal")
      .order("date", { ascending: false })
      .limit(3);
    parts.push(
      "## Recent journal notes\n" +
        ((data ?? []).map((j) => `- ${j.date}: ${j.note}`).join("\n") || "None"),
    );
  }

  return parts.join("\n\n");
}

export default function GuidePage() {
  const { settings, set } = useSettings();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<CategoryKey>>(
    new Set(CATEGORIES.filter((c) => c.default).map((c) => c.key)),
  );
  const [prompt, setPrompt] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  const sensitiveSelected = useMemo(
    () => CATEGORIES.some((c) => c.sensitive && selected.has(c.key)),
    [selected],
  );

  return (
    <div className="space-y-8 pb-8">
      <section className="surface p-5" aria-label="How the Guide thinks">
        <h2 className="eyebrow mb-2">Orbit Guide</h2>
        <p className="max-w-xl text-sm text-ink-dim">
          The Guide ranks your backlog with plain arithmetic, not AI: due dates, importance,
          project priority, how long a task takes versus your free time, how often it has been
          deferred, your energy, and the time of day. Every suggestion shows its reasons.
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-ink">Energy today</span>
          <Segmented
            label="Energy today"
            value={settings.energyToday ?? "medium"}
            onChange={(v) => set({ energyToday: v })}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Steady" },
              { value: "high", label: "High" },
            ]}
          />
        </div>
      </section>

      <section className="surface p-5" aria-label="Ask Claude">
        <h2 className="eyebrow mb-2">Ask Claude</h2>
        <p className="mb-4 max-w-xl text-sm text-ink-dim">
          Build a planning prompt from your Orbit data, review exactly what it contains, copy
          it, and open Claude. Nothing is ever sent automatically.
        </p>

        <div className="mb-4">
          {CATEGORIES.map((c) => (
            <Toggle
              key={c.key}
              checked={selected.has(c.key)}
              onChange={(on) => {
                const next = new Set(selected);
                if (on) next.add(c.key);
                else next.delete(c.key);
                setSelected(next);
                setPrompt(null);
              }}
              label={c.label}
              description={c.sensitive ? "Personal. Off unless you choose to include it." : undefined}
            />
          ))}
        </div>

        {sensitiveSelected && (
          <p className="mb-4 rounded-xl border border-(--accent)/25 bg-accent-soft px-3.5 py-2.5 text-[13px] text-ink-dim">
            You are including personal reflections. Review the preview carefully before
            copying it anywhere.
          </p>
        )}

        <Button
          variant="primary"
          loading={building}
          onClick={async () => {
            setBuilding(true);
            try {
              setPrompt(await collect(selected));
            } finally {
              setBuilding(false);
            }
          }}
        >
          Build prompt
        </Button>

        {prompt !== null && (
          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-dim">
                Preview: everything Claude will see
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={14}
                className="tnum w-full rounded-xl border border-line bg-bg0/70 p-3.5 font-mono text-[12.5px] leading-relaxed text-ink-dim focus:border-(--accent)/50 focus:outline-none"
              />
            </label>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(prompt);
                  toast("Prompt copied", "success");
                }}
              >
                Copy prompt
              </Button>
              <a
                href="https://claude.ai/new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center rounded-xl border border-line bg-bg1 px-4 text-sm font-medium text-ink transition-colors hover:bg-bg2"
              >
                Open Claude
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
