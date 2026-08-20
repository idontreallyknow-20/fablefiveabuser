"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  useClaimTeamDay,
  useTeam,
  useTeamDay,
  useTeamRealtime,
  useTeamStreak,
  useTeamToday,
} from "@/lib/data/teams";
import { useGlowStore } from "@/lib/spotify/glow";
import { IconCheck } from "@/components/ui/Icons";

/** one-shot atmosphere pulse through the album-glow pathway */
function usePulse() {
  const setColor = useGlowStore((s) => s.setColor);
  const prev = useRef<string | null>(null);
  return (color: string) => {
    prev.current = useGlowStore.getState().color;
    setColor(color);
    setTimeout(() => setColor(prev.current), 4000);
  };
}

function MemberRow({
  name,
  done,
  total,
}: {
  name: string;
  done: number;
  total: number;
}) {
  const aligned = total > 0 && done >= total;
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-transparent ${
          aligned ? "border-(--accent)/60 bg-accent-soft !text-accent" : "border-line"
        }`}
      >
        <IconCheck size={11} />
      </span>
      <span className="flex-1 truncate text-[13.5px] text-ink-dim">{name || "…"}</span>
      <span className="tnum font-mono text-[11.5px] text-ink-faint">
        {total === 0 ? "—" : `${done}/${total}`}
      </span>
    </li>
  );
}

export function TeamWidget() {
  const { data, isLoading } = useTeam();
  const teamId = data?.team.id;
  useTeamRealtime(teamId);
  const { data: today = [] } = useTeamToday(teamId);
  const { data: streak = 0 } = useTeamStreak(teamId);
  const { data: day } = useTeamDay(teamId);
  const claim = useClaimTeamDay();
  const pulse = usePulse();

  const claimed = Boolean(day?.bonus_at);
  const aligned =
    today.length > 0 &&
    today.every((m) => m.priorities_total > 0 && m.priorities_done >= m.priorities_total);

  // celebrate the moment the bonus lands (from either member's client)
  const sawBonus = useRef(false);
  useEffect(() => {
    if (claimed && !sawBonus.current) {
      sawBonus.current = true;
      const accent =
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
        "#d9a05b";
      pulse(accent);
    }
    if (!claimed) sawBonus.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimed]);

  if (isLoading) return <section aria-label="Team" className="surface h-full rounded-2xl p-4" />;

  if (!data) {
    return (
      <section aria-label="Team" className="surface flex h-full flex-col rounded-2xl p-4">
        <h2 className="eyebrow mb-2">Team</h2>
        <Link
          href="/space/team"
          className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line text-[13px] text-ink-faint transition-colors hover:border-(--accent)/50 hover:text-ink"
        >
          Create or join
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Team" className="surface flex h-full flex-col rounded-2xl p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="eyebrow">{data.team.name || "Team"}</h2>
        {streak > 0 && (
          <span className="tnum font-mono text-[12px] text-accent">{streak}d</span>
        )}
      </div>
      <ul className="flex flex-1 flex-col justify-center gap-1.5">
        {today.map((m) => (
          <MemberRow
            key={m.user_id}
            name={m.display_name}
            done={m.priorities_done}
            total={m.priorities_total}
          />
        ))}
      </ul>
      {claimed ? (
        <p className="mt-2 text-center font-mono text-[11.5px] uppercase tracking-[0.14em] text-accent">
          aligned
        </p>
      ) : aligned ? (
        <button
          onClick={() => teamId && claim.mutate(teamId)}
          disabled={claim.isPending}
          className="mt-2 h-9 rounded-xl border border-(--accent)/50 bg-accent-soft text-[13px] font-medium text-accent transition-colors hover:border-(--accent)"
        >
          Claim the day
        </button>
      ) : null}
    </section>
  );
}
