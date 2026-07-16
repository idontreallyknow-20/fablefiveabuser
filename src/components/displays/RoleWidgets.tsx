"use client";

import { useQuery } from "@tanstack/react-query";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Clock } from "@/components/today/Clock";

/** side-display extras: recently played (server route may 503 gracefully) */
export function DisplaySpotifyExtras() {
  const { data } = useQuery({
    queryKey: ["spotify", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/spotify/recent");
      if (!res.ok) return { items: [] as { name: string; artists: string; playedAt: string }[] };
      return res.json() as Promise<{ items: { name: string; artists: string; playedAt: string }[] }>;
    },
    refetchInterval: 5 * 60 * 1000,
  });
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="surface p-4">
      <p className="eyebrow mb-2.5">Recently played</p>
      <ol className="flex flex-col gap-1.5">
        {items.slice(0, 6).map((t, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-dim">{t.name}</span>
            <span className="shrink-0 truncate text-[12px] text-ink-faint">{t.artists}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** nerfchess wall view: next actions first */
export function DisplayNerf() {
  const { data: tasks = [] } = useQuery({
    queryKey: ["display", "nerf-tasks"],
    queryFn: async () => {
      const supabase = supabaseBrowser();
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .in("kind", ["nerf_product", "nerf_marketing"]);
      if (!projects?.length) return [];
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .in("project_id", projects.map((p) => p.id))
        .is("completed_at", null)
        .in("status", ["next", "building", "testing"])
        .order("updated_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
  const { data: content = [] } = useQuery({
    queryKey: ["display", "nerf-content"],
    queryFn: async () => {
      const { data } = await supabaseBrowser()
        .from("nerf_content")
        .select("*")
        .in("stage", ["script", "record", "edit", "ready"])
        .order("updated_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <Clock size="compact" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="surface p-4">
          <p className="eyebrow mb-2.5">Product · in motion</p>
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-faint">Nothing in progress.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-baseline gap-2.5 text-sm">
                  <span className="tnum shrink-0 font-mono text-[11px] uppercase text-ink-faint">
                    {t.status}
                  </span>
                  <span className="truncate text-ink-dim">{t.title}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="surface p-4">
          <p className="eyebrow mb-2.5">Marketing · pipeline</p>
          {content.length === 0 ? (
            <p className="text-sm text-ink-faint">Nothing queued.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {content.map((c) => (
                <li key={c.id} className="flex items-baseline gap-2.5 text-sm">
                  <span className="tnum shrink-0 font-mono text-[11px] uppercase text-ink-faint">
                    {c.stage}
                  </span>
                  <span className="truncate text-ink-dim">{c.hook || c.concept || "Untitled"}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

/** fitness wall view: today's session and recent records */
export function DisplayFitness() {
  const { data } = useQuery({
    queryKey: ["display", "fitness"],
    queryFn: async () => {
      const supabase = supabaseBrowser();
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: session }, { data: prs }] = await Promise.all([
        supabase
          .from("workout_sessions")
          .select("*, workout_entries(*)")
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("workout_entries")
          .select("*")
          .eq("is_pr", true)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return { session, prs: prs ?? [] };
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <Clock size="compact" />
      <div className="surface p-4">
        <p className="eyebrow mb-2.5">Today's session</p>
        {data?.session ? (
          <p className="text-sm text-ink-dim">
            {data.session.split || "Training"} ·{" "}
            <span className="tnum font-mono">
              {(data.session as { workout_entries?: unknown[] }).workout_entries?.length ?? 0} sets
            </span>
          </p>
        ) : (
          <p className="text-sm text-ink-faint">No session yet today.</p>
        )}
      </div>
      {data && data.prs.length > 0 && (
        <div className="surface p-4">
          <p className="eyebrow mb-2.5">Recent records</p>
          <ol className="flex flex-col gap-1.5">
            {data.prs.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink-dim">{e.exercise_name}</span>
                <span className="tnum font-mono text-[12px] text-accent">
                  {e.weight_kg ? `${e.weight_kg}kg × ${e.reps}` : e.reps ? `${e.reps} reps` : e.hold_seconds ? `${e.hold_seconds}s hold` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
